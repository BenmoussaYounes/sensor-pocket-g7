import Database from 'better-sqlite3';
import { EventsService } from '../events/events.service';
import { MqttService } from '../mqtt/mqtt.service';
import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  let db: Database.Database;
  let service: DevicesService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE devices (
        id TEXT PRIMARY KEY,
        groupe TEXT NOT NULL,
        status TEXT NOT NULL,
        last_activity INTEGER NOT NULL
      );
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device TEXT NOT NULL,
        ts INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL
      );
    `);
    service = new DevicesService(db, {} as MqttService, new EventsService(db));
  });

  afterEach(() => {
    db.close();
  });

  it('creates an online device when a telemetry message is received', () => {
    service.refreshFromTelemetry(
      { groupe: 'group7', deviceId: 'esp-01' },
      { ts: 1000, t: 22, seq: 1 },
    );

    expect(service.findOne('esp-01')).toMatchObject({
      id: 'esp-01',
      groupe: 'group7',
      status: 'online',
      last_activity: expect.any(Number),
    });
  });

  it('updates the current status without creating a second device', () => {
    service.refreshFromStatus(
      { groupe: 'group7', deviceId: 'esp-01' },
      { status: 'offline' },
    );
    const firstActivity = service.findOne('esp-01')?.last_activity;

    service.refreshFromTelemetry(
      { groupe: 'group7', deviceId: 'esp-01' },
      { ts: 2000, t: 22.5, seq: 2 },
    );
    const device = service.findOne('esp-01');

    expect(service.findAll()).toHaveLength(1);
    expect(device).toMatchObject({ status: 'online', groupe: 'group7' });
    expect(device?.last_activity).toBeGreaterThanOrEqual(firstActivity ?? 0);
  });
});