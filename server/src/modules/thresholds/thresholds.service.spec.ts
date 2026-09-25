import Database from 'better-sqlite3';
import { ThresholdsService } from './thresholds.service';

describe('ThresholdsService', () => {
  let db: Database.Database;
  let service: ThresholdsService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE thresholds (
        device TEXT PRIMARY KEY,
        tMin REAL NOT NULL,
        tMax REAL NOT NULL,
        hMin REAL NOT NULL,
        hMax REAL NOT NULL,
        holdMinutes INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (tMin < tMax),
        CHECK (hMin < hMax),
        CHECK (holdMinutes >= 0)
      );
    `);
    service = new ThresholdsService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('stores a valid threshold configuration for a device', () => {
    const result = service.upsertForDevice('esp-01', {
      tMin: 2,
      tMax: 8,
      hMin: 30,
      hMax: 60,
      holdMinutes: 15,
    });

    expect(result).toMatchObject({
      device: 'esp-01',
      tMin: 2,
      tMax: 8,
      hMin: 30,
      hMax: 60,
      holdMinutes: 15,
    });
  });

  it('rejects invalid threshold ranges', () => {
    expect(() =>
      service.upsertForDevice('esp-01', {
        tMin: 10,
        tMax: 8,
        hMin: 30,
        hMax: 60,
        holdMinutes: 15,
      }),
    ).toThrow('tMin doit être strictement inférieur à tMax');
  });
});
