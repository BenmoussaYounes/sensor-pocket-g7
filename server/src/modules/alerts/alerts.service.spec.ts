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

  it('stops the alert immediately after a normal reading', () => {
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
    expect(setLed).toHaveBeenCalledWith('frigo-01', false);

    jest.useRealTimers();
  });
  it('notifies alert_stopped and exposes active alerts correctly when thresholds are removed', () => {
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

    let current: typeof thresholds | undefined = thresholds;
    const thresholdsService = {
      getForDevice: jest.fn(() => current),
    } as any;
    const eventsService = { record: jest.fn() } as any;

    const service = new AlertsService(mqttService, thresholdsService, eventsService);
    const notifications: any[] = [];
    service.onAlert((n) => notifications.push(n));
    service.onModuleInit();

    const send = (t: number, seq: number) =>
      telemetryListeners.forEach((l) =>
        l('sentinelle/frigo/frigo-01/telemetry', { ts: seq, t, h: 50, seq }),
      );

    send(12, 1);
    jest.advanceTimersByTime(60_001);
    expect(service.getActiveAlerts()).toEqual([
      { deviceId: 'frigo-01', type: 'temperature_or_humidity_threshold', holdMinutes: 1 },
    ]);

    current = undefined; // seuils supprimés pendant l'alerte
    send(5, 2);

    expect(service.getActiveAlerts()).toEqual([]);
    expect(notifications.map((n) => n.event)).toEqual(['alert_started', 'alert_stopped']);
    expect(notifications[1].data.reason).toBe('thresholds_removed');

    jest.useRealTimers();
  });
});
