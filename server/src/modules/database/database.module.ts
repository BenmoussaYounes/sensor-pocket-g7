import { Global, Logger, Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export const SQLITE_CONNECTION = 'SQLITE_CONNECTION';

/**
 * Module global : ouvre (ou crée) le fichier SQLite et s'assure que le schéma
 * existe. Fourni via un provider factory pour ne créer qu'une seule instance
 * de connexion, réutilisée par tous les services (pattern classique avec
 * better-sqlite3, qui est synchrone et thread-safe pour un usage mono-process).
 */
@Global()
@Module({
  providers: [
    {
      provide: SQLITE_CONNECTION,
      useFactory: (): Database.Database => {
        const logger = new Logger('DatabaseModule');
        const dbPath =
          process.env.SQLITE_PATH ||
          path.join(process.cwd(), 'data', 'sentinelle.db');

        fs.mkdirSync(path.dirname(dbPath), { recursive: true });

        const db = new Database(dbPath);

        // WAL : les lectures (requêtes d'historique) ne bloquent pas les
        // insertions de télémétrie qui arrivent en continu, et inversement.
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('foreign_keys = ON');

        db.exec(`
          CREATE TABLE IF NOT EXISTS measurements (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            device      TEXT    NOT NULL,
            seq         INTEGER NOT NULL,
            ts          INTEGER NOT NULL,
            received_at INTEGER NOT NULL,
            t           REAL    NOT NULL,
            h           REAL
          );

          -- Index composite (device, ts) : la requête historique typique est
          -- "WHERE device = ? AND ts BETWEEN ? AND ?". SQLite range dans un
          -- B-tree en respectant l'ordre des colonnes : device en tête permet
          -- une égalité (recherche exacte de la branche du device), puis ts
          -- permet un scan de plage strictement croissant sur cette branche.
          -- Avec des millions de lignes toutes confondues, cet index évite un
          -- full table scan : seule la tranche [device, ts_min .. ts_max] est
          -- parcourue. L'ordre inverse (ts, device) serait bien moins
          -- efficace ici car ts seul ne filtre pas assez (toutes les devices
          -- mélangées sur la plage de dates).
          CREATE INDEX IF NOT EXISTS idx_measurements_device_ts
            ON measurements (device, ts);

          CREATE TABLE IF NOT EXISTS devices (
            id            TEXT PRIMARY KEY,
            groupe        TEXT NOT NULL,
            status        TEXT NOT NULL,
            last_activity INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS thresholds (
            device      TEXT PRIMARY KEY,
            tMin        REAL NOT NULL,
            tMax        REAL NOT NULL,
            hMin        REAL NOT NULL,
            hMax        REAL NOT NULL,
            holdMinutes INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL,
            FOREIGN KEY(device) REFERENCES devices(id) ON DELETE CASCADE,
            CHECK (tMin < tMax),
            CHECK (hMin < hMax),
            CHECK (holdMinutes >= 0)
          );
        `);

        logger.log(`Base SQLite prête (${dbPath})`);
        return db;
      },
    },
  ],
  exports: [SQLITE_CONNECTION],
})
export class DatabaseModule {}
