import { Inject, Injectable } from '@nestjs/common';
import type { Database, Statement } from 'better-sqlite3';
import { SQLITE_CONNECTION } from '../database/database.module';

export interface ThresholdRow {
  device: string;
  tMin: number;
  tMax: number;
  hMin: number;
  hMax: number;
  holdMinutes: number;
  updated_at: number;
}

export interface ThresholdInput {
  tMin: number;
  tMax: number;
  hMin: number;
  hMax: number;
  holdMinutes: number;
}

// Cas métier du groupe frigo : températures de conservation froide typiquement
// autour de 2-8 °C, humidité de 30-60 %, et holdMinutes de 15 min pour éviter
// les faux positifs lors de petites oscillations.

@Injectable()
export class ThresholdsService {
  private readonly upsertStmt: Statement;

  constructor(@Inject(SQLITE_CONNECTION) private readonly db: Database) {
    this.upsertStmt = this.db.prepare(`
      INSERT INTO thresholds (device, tMin, tMax, hMin, hMax, holdMinutes, updated_at)
      VALUES (@device, @tMin, @tMax, @hMin, @hMax, @holdMinutes, @updated_at)
      ON CONFLICT(device) DO UPDATE SET
        tMin = excluded.tMin,
        tMax = excluded.tMax,
        hMin = excluded.hMin,
        hMax = excluded.hMax,
        holdMinutes = excluded.holdMinutes,
        updated_at = excluded.updated_at
    `);
  }

  getForDevice(deviceId: string): ThresholdRow | undefined {
    return this.db
      .prepare('SELECT * FROM thresholds WHERE device = ?')
      .get(deviceId) as ThresholdRow | undefined;
  }

  findAll(): ThresholdRow[] {
    return this.db
      .prepare('SELECT * FROM thresholds ORDER BY device')
      .all() as ThresholdRow[];
  }

  deleteForDevice(deviceId: string): boolean {
    const result = this.db
      .prepare('DELETE FROM thresholds WHERE device = ?')
      .run(deviceId);
    return result.changes > 0;
  }

  upsertForDevice(deviceId: string, values: ThresholdInput): ThresholdRow {
    this.validate(values);

    const updatedAt = Date.now();
    this.upsertStmt.run({
      device: deviceId,
      tMin: values.tMin,
      tMax: values.tMax,
      hMin: values.hMin,
      hMax: values.hMax,
      holdMinutes: values.holdMinutes,
      updated_at: updatedAt,
    });

    return this.getForDevice(deviceId)!;
  }

  validate(values: ThresholdInput): void {
    if (!(values.tMin < values.tMax)) {
      throw new Error('tMin doit être strictement inférieur à tMax');
    }
    if (!(values.hMin < values.hMax)) {
      throw new Error('hMin doit être strictement inférieur à hMax');
    }
    if (!(Number.isFinite(values.holdMinutes) && values.holdMinutes >= 0)) {
      throw new Error('holdMinutes doit être un entier positif ou nul');
    }
    if (
      !Number.isFinite(values.tMin) ||
      !Number.isFinite(values.tMax) ||
      !Number.isFinite(values.hMin) ||
      !Number.isFinite(values.hMax)
    ) {
      throw new Error('Les seuils doivent être des nombres valides');
    }
  }
}
