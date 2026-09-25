import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { Database, Statement } from 'better-sqlite3';
import { SQLITE_CONNECTION } from '../database/database.module';
import {
  DeviceStatusMessage,
  MqttService,
  TelemetryMessage,
} from '../mqtt/mqtt.service';

export interface DeviceRow {
  id: string;
  groupe: string;
  status: string;
  last_activity: number;
}

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly upsertStatement: Statement;

  constructor(
    @Inject(SQLITE_CONNECTION) private readonly db: Database,
    private readonly mqttService: MqttService,
  ) {
    this.upsertStatement = this.db.prepare(`
      INSERT INTO devices (id, groupe, status, last_activity)
      VALUES (@id, @groupe, @status, @last_activity)
      ON CONFLICT(id) DO UPDATE SET
        groupe = excluded.groupe,
        status = excluded.status,
        last_activity = excluded.last_activity
    `);
  }

  onModuleInit(): void {
    this.mqttService.onTelemetry((topic, telemetry) => {
      const topicParts = this.parseTopic(topic);
      if (topicParts) {
        this.refreshFromTelemetry(topicParts, telemetry);
      }
    });

    this.mqttService.onStatus((topic, status) => {
      const topicParts = this.parseTopic(topic);
      if (topicParts) {
        this.refreshFromStatus(topicParts, status);
      }
    });
  }

  refreshFromTelemetry(
    topicParts: { groupe: string; deviceId: string },
    _telemetry: TelemetryMessage,
  ): void {
    this.upsert(topicParts.groupe, topicParts.deviceId, 'online');
  }

  refreshFromStatus(
    topicParts: { groupe: string; deviceId: string },
    status: DeviceStatusMessage,
  ): void {
    this.upsert(topicParts.groupe, topicParts.deviceId, status.status);
  }

  findAll(): DeviceRow[] {
    return this.db
      .prepare('SELECT * FROM devices ORDER BY id')
      .all() as DeviceRow[];
  }

  findOne(deviceId: string): DeviceRow | undefined {
    return this.db
      .prepare('SELECT * FROM devices WHERE id = ?')
      .get(deviceId) as DeviceRow | undefined;
  }

  private upsert(groupe: string, deviceId: string, status: string): void {
    this.upsertStatement.run({
      id: deviceId,
      groupe,
      status,
      last_activity: Date.now(),
    });
  }

  private parseTopic(
    topic: string,
  ): { groupe: string; deviceId: string } | undefined {
    const [prefix, groupe, deviceId] = topic.split('/');
    if (prefix !== 'sentinelle' || !groupe || !deviceId) {
      return undefined;
    }
    return { groupe, deviceId };
  }
}