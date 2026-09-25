import Database from 'better-sqlite3';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let db: Database.Database;
  let service: EventsService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device TEXT NOT NULL,
        ts INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL
      );
    `);
    service = new EventsService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('stores a device event with a timestamp and payload', () => {
    const event = service.record('esp-01', 'device_status', {
      status: 'online',
      source: 'mqtt',
    });

    expect(event).toMatchObject({
      device: 'esp-01',
      type: 'device_status',
    });
    expect(JSON.parse(event.content)).toMatchObject({
      status: 'online',
      source: 'mqtt',
    });
  });

  it('returns only events for the correct device and time range', () => {
    service.record('esp-01', 'device_status', { status: 'online' }, 1000);
    service.record('esp-01', 'device_status', { status: 'offline' }, 2000);
    service.record('esp-02', 'device_status', { status: 'online' }, 1500);

    const rows = service.findByDeviceAndRange('esp-01', 1500, 2500);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      device: 'esp-01',
      type: 'device_status',
      ts: 2000,
    });
  });
});
