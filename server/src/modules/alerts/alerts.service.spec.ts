import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  const thresholds = {
    device: 'frigo-01',
    tMin: 2,
    tMax: 8,
    hMin: 30,
    hMax: 60,
    holdMinutes: 1,
    updated_at: Date.now(),
  };

  it('starts the alert only after the hold timeout is reached', () => {
    jest.useFakeTimers();

    const setLed = jest.fn();
    const telemetryListeners = new Set<(topic: string, telemetry: any) => void>();
    const mqttService = {
      onTelemetry: jest.fn((listener) => {
        telemetryListeners.add(listener);
        return () => telemetryListeners.delete(listener);
      }),
      setLed,
    } as any;

    const thresholdsService = {
      getForDevice: jest.fn(() => thresholds),
    } as any;

    const eventsService = {
      record: jest.fn(),
    } as any;

    const service = new AlertsService(mqttService, thresholdsService, eventsService);
    service.onModuleInit();

    telemetryListeners.forEach((listener) =>
      listener('sentinelle/frigo/frigo-01/telemetry', { ts: 1, t: 12, h: 50, seq: 1 }),
    );

    expect(setLed).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_001);
    expect(setLed).toHaveBeenCalledWith('frigo-01', true);

    jest.useRealTimers();
  });

  it('stops the alert after a normal reading persists for the hold timeout', () => {
    jest.useFakeTimers();

    const setLed = jest.fn();
    const telemetryListeners = new Set<(topic: string, telemetry: any) => void>();
    const mqttService = {
      onTelemetry: jest.fn((listener) => {
        telemetryListeners.add(listener);
        return () => telemetryListeners.delete(listener);
      }),
      setLed,
    } as any;

    const thresholdsService = {
      getForDevice: jest.fn(() => thresholds),
    } as any;

    const eventsService = {
      record: jest.fn(),
    } as any;

    const service = new AlertsService(mqttService, thresholdsService, eventsService);
    service.onModuleInit();

    telemetryListeners.forEach((listener) =>
      listener('sentinelle/frigo/frigo-01/telemetry', { ts: 1, t: 12, h: 50, seq: 1 }),
    );
    jest.advanceTimersByTime(60_001);

    telemetryListeners.forEach((listener) =>
      listener('sentinelle/frigo/frigo-01/telemetry', { ts: 2, t: 5, h: 40, seq: 2 }),
    );

    expect(setLed).toHaveBeenCalledWith('frigo-01', true);
    jest.advanceTimersByTime(60_001);
    expect(setLed).toHaveBeenCalledWith('frigo-01', false);

    jest.useRealTimers();
  });
});
