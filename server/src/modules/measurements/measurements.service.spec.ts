import Database from 'better-sqlite3';
import { MqttService } from '../mqtt/mqtt.service';
import { MeasurementsService } from './measurements.service';

describe('MeasurementsService', () => {
  let db: Database.Database;
  let service: MeasurementsService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device TEXT NOT NULL,
        seq INTEGER NOT NULL,
        ts INTEGER NOT NULL,
        received_at INTEGER NOT NULL,
        t REAL NOT NULL,
        h REAL
      );
      CREATE INDEX idx_measurements_device_ts
        ON measurements (device, ts);
    `);

    service = new MeasurementsService(db, {} as MqttService);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts one immutable row for each telemetry message', () => {
    service.record('esp-01', { ts: 1000, t: 22.2, h: 48.5, seq: 7 });
    service.record('esp-01', { ts: 2000, t: 22.4, h: 48.1, seq: 8 });

    const rows = service.findByDeviceAndRange('esp-01', 1000, 2000);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      device: 'esp-01',
      ts: 1000,
      t: 22.2,
      h: 48.5,
      seq: 7,
    });
    expect(rows[1]).toMatchObject({ seq: 8, ts: 2000 });
    expect(rows[0].received_at).toEqual(expect.any(Number));
  });

  it('uses the device and timestamp range for history queries', () => {
    service.record('esp-01', { ts: 1000, t: 20, seq: 1 });
    service.record('esp-01', { ts: 2000, t: 21, seq: 2 });
    service.record('esp-02', { ts: 1500, t: 30, seq: 1 });

    const rows = service.findByDeviceAndRange('esp-01', 1500, 2500);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ device: 'esp-01', ts: 2000 });

    const queryPlan = db
      .prepare(
        'EXPLAIN QUERY PLAN SELECT * FROM measurements WHERE device = ? AND ts BETWEEN ? AND ?',
      )
      .all('esp-01', 1500, 2500) as Array<{ detail: string }>;

    expect(
      queryPlan.some(({ detail }) => detail.includes('idx_measurements_device_ts')),
    ).toBe(true);
  });
});