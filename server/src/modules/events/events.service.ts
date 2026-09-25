import { Inject, Injectable } from '@nestjs/common';
import type { Database, Statement } from 'better-sqlite3';
import { SQLITE_CONNECTION } from '../database/database.module';

export interface EventRow {
  id: number;
  device: string;
  ts: number;
  type: string;
  content: string;
}

@Injectable()
export class EventsService {
  private readonly insertStmt: Statement;

  constructor(@Inject(SQLITE_CONNECTION) private readonly db: Database) {
    this.insertStmt = this.db.prepare(`
      INSERT INTO events (device, ts, type, content)
      VALUES (@device, @ts, @type, @content)
    `);
  }

  record(
    deviceId: string,
    type: string,
    content: Record<string, unknown> | string,
    ts = Date.now(),
  ): EventRow {
    const payload = typeof content === 'string' ? content : JSON.stringify(content);

    this.insertStmt.run({
      device: deviceId,
      ts,
      type,
      content: payload,
    });

    const row = this.db
      .prepare('SELECT last_insert_rowid() AS id')
      .get() as { id: number } | undefined;

    return {
      id: Number(row?.id ?? 0),
      device: deviceId,
      ts,
      type,
      content: payload,
    };
  }

  findByDeviceAndRange(
    deviceId: string,
    tsFrom: number,
    tsTo: number,
    type?: string,
    limit = 100,
  ): EventRow[] {
    const sql = `
      SELECT * FROM events
      WHERE device = ? AND ts BETWEEN ? AND ?
      ${type ? 'AND type = ?' : ''}
      ORDER BY ts DESC
      LIMIT ?
    `;

    const params = type
      ? [deviceId, tsFrom, tsTo, type, limit]
      : [deviceId, tsFrom, tsTo, limit];

    return this.db.prepare(sql).all(...params) as EventRow[];
  }

  findRecent(limit = 50): EventRow[] {
    return this.db
      .prepare(
        `SELECT * FROM events ORDER BY ts DESC LIMIT ?`,
      )
      .all(limit) as EventRow[];
  }
}
