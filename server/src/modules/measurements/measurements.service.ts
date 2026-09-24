import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Database, Statement } from 'better-sqlite3';
import { SQLITE_CONNECTION } from '../database/database.module';
import { MqttService, TelemetryMessage } from '../mqtt/mqtt.service';

export interface MeasurementRow {
  id: number;
  device: string;
  seq: number | null;
  ts: number;
  received_at: number;
  t: number;
  h: number | null;
}

/**
 * Historise chaque message de télémétrie reçu par MQTT dans la table
 * `measurements`. Chaque message MQTT valide produit exactement une ligne ;
 * aucune ligne n'est jamais mise à jour ni supprimée (append-only), ce qui
 * garde l'historique fidèle à ce qui a réellement été reçu.
 */
@Injectable()
export class MeasurementsService implements OnModuleInit {
  private readonly logger = new Logger(MeasurementsService.name);
  private readonly insertStmt: Statement;

  constructor(
    @Inject(SQLITE_CONNECTION) private readonly db: Database,
    private readonly mqttService: MqttService,
  ) {
    this.insertStmt = this.db.prepare(`
      INSERT INTO measurements (device, seq, ts, received_at, t, h)
      VALUES (@device, @seq, @ts, @received_at, @t, @h)
    `);
  }

  onModuleInit(): void {
    // Même flux que TelemetryGateway : un message telemetry MQTT valide
    // déclenche à la fois la diffusion WebSocket et l'écriture en base.
    this.mqttService.onTelemetry((topic, telemetry) => {
      const deviceId = topic.split('/')[2];
      this.record(deviceId, telemetry);
    });
  }

  /** Insère une ligne d'historique. N'est jamais suivi d'un UPDATE. */
  record(deviceId: string, telemetry: TelemetryMessage): void {
    try {
      this.insertStmt.run({
        device: deviceId,
        seq: telemetry.seq ?? null,
        ts: telemetry.ts,
        received_at: Date.now(),
        t: telemetry.t,
        h: telemetry.h ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Échec de l'insertion de la mesure pour ${deviceId} : ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  /**
   * Historique d'un device sur une plage de temps.
   * Correspond exactement au pattern couvert par l'index (device, ts).
   * Si `limit` est fourni, on prend les lignes les plus récentes de la
   * plage (ORDER BY ts DESC + LIMIT, qui reste couvert par l'index) puis on
   * remet dans l'ordre chronologique avant de renvoyer.
   */
  findByDeviceAndRange(
    device: string,
    tsFrom: number,
    tsTo: number,
    limit?: number,
  ): MeasurementRow[] {
    const stmt = this.db.prepare(
      `SELECT * FROM measurements
       WHERE device = ? AND ts BETWEEN ? AND ?
       ORDER BY ts DESC
       ${limit ? 'LIMIT ?' : ''}`,
    );

    const rows = (
      limit
        ? stmt.all(device, tsFrom, tsTo, limit)
        : stmt.all(device, tsFrom, tsTo)
    ) as MeasurementRow[];

    return rows.reverse();
  }

  /** Dernière mesure connue d'un device. */
  findLatest(device: string): MeasurementRow | undefined {
    return this.db
      .prepare(
        `SELECT * FROM measurements
         WHERE device = ?
         ORDER BY ts DESC
         LIMIT 1`,
      )
      .get(device) as MeasurementRow | undefined;
  }
}
