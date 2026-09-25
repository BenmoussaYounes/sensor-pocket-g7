import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { MqttService, TelemetryMessage } from '../mqtt/mqtt.service';
import { ThresholdRow, ThresholdsService } from '../thresholds/thresholds.service';

type AlertState = {
  breachTimer?: NodeJS.Timeout;
  recoveryTimer?: NodeJS.Timeout;
  blinkInterval?: NodeJS.Timeout;
  alertActive: boolean;
};

export type AlertNotification = {
  event: 'alert_started' | 'alert_stopped';
  data: Record<string, unknown>;
};

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);
  private readonly alertStates = new Map<string, AlertState>();
  private readonly latestTelemetryByDevice = new Map<string, TelemetryMessage>();
  private readonly alertListeners = new Set<
    (notification: AlertNotification) => void
  >();

  constructor(
    private readonly mqttService: MqttService,
    private readonly thresholdsService: ThresholdsService,
    private readonly eventsService: EventsService,
  ) {}

  onModuleInit(): void {
    this.mqttService.onTelemetry((topic, telemetry) => {
      const deviceId = this.extractDeviceId(topic);
      if (!deviceId) {
        return;
      }

      this.latestTelemetryByDevice.set(deviceId, telemetry);
      this.handleTelemetry(deviceId, telemetry);
    });
  }

  onAlert(listener: (notification: AlertNotification) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  private handleTelemetry(deviceId: string, telemetry: TelemetryMessage): void {
    const thresholds = this.thresholdsService.getForDevice(deviceId);
    if (!thresholds) {
      this.clearTimers(deviceId);
      return;
    }

    const isBreached = this.isThresholdExceeded(telemetry, thresholds);
    const state = this.getState(deviceId);

    if (isBreached) {
      this.clearRecoveryTimer(deviceId);

      if (!state.breachTimer && !state.alertActive) {
        state.breachTimer = setTimeout(() => {
          const latest = this.latestTelemetryByDevice.get(deviceId);
          if (latest && this.isThresholdExceeded(latest, thresholds)) {
            this.startAlert(deviceId, thresholds);
          }
          state.breachTimer = undefined;
        }, thresholds.holdMinutes * 60_000);

        this.eventsService.record(deviceId, 'threshold_breach_pending', {
          deviceId,
          holdMinutes: thresholds.holdMinutes,
          t: telemetry.t,
          h: telemetry.h,
        });
      }
      return;
    }

    this.clearBreachTimer(deviceId);

    if (state.alertActive) {
      this.clearRecoveryTimer(deviceId);
      this.stopAlert(deviceId);
    }
  }

  private startAlert(deviceId: string, thresholds: ThresholdRow): void {
    const state = this.getState(deviceId);
    if (state.alertActive) {
      return;
    }

    state.alertActive = true;
    this.logger.warn(
      `Alerte démarrée pour ${deviceId} : température ou humidité hors seuil pendant ${thresholds.holdMinutes} min`,
    );

    this.eventsService.record(deviceId, 'alert_started', {
      deviceId,
      type: 'temperature_or_humidity_threshold',
      holdMinutes: thresholds.holdMinutes,
      thresholds,
    });
    this.notifyAlert({
      event: 'alert_started',
      data: {
        deviceId,
        type: 'temperature_or_humidity_threshold',
        holdMinutes: thresholds.holdMinutes,
        thresholds,
      },
    });

    this.mqttService.setLed(deviceId, true);
    state.blinkInterval = setInterval(() => {
      this.mqttService.setLed(deviceId, true);
      setTimeout(() => {
        try {
          this.mqttService.setLed(deviceId, false);
        } catch {
          // ignore: la commande peut être impossible si MQTT est hors ligne
        }
      }, 1500);
    }, 3000);
  }

  private stopAlert(deviceId: string): void {
    const state = this.getState(deviceId);
    if (!state.alertActive) {
      return;
    }

    state.alertActive = false;
    if (state.blinkInterval) {
      clearInterval(state.blinkInterval);
      state.blinkInterval = undefined;
    }

    this.logger.log(`Alerte arrêtée pour ${deviceId}`);
    this.eventsService.record(deviceId, 'alert_stopped', {
      deviceId,
      reason: 'threshold_normalized',
    });
    this.notifyAlert({
      event: 'alert_stopped',
      data: {
        deviceId,
        reason: 'threshold_normalized',
      },
    });

    try {
      this.mqttService.setLed(deviceId, false);
    } catch {
      // ignore: la commande peut être impossible si MQTT est hors ligne
    }
  }

  private clearTimers(deviceId: string): void {
    const state = this.alertStates.get(deviceId);
    if (!state) {
      return;
    }

    this.clearBreachTimer(deviceId);
    this.clearRecoveryTimer(deviceId);
    if (state.blinkInterval) {
      clearInterval(state.blinkInterval);
      state.blinkInterval = undefined;
    }
    state.alertActive = false;
  }

  private clearBreachTimer(deviceId: string): void {
    const state = this.alertStates.get(deviceId);
    if (state?.breachTimer) {
      clearTimeout(state.breachTimer);
      state.breachTimer = undefined;
    }
  }

  private clearRecoveryTimer(deviceId: string): void {
    const state = this.alertStates.get(deviceId);
    if (state?.recoveryTimer) {
      clearTimeout(state.recoveryTimer);
      state.recoveryTimer = undefined;
    }
  }

  private getState(deviceId: string): AlertState {
    const existing = this.alertStates.get(deviceId);
    if (existing) {
      return existing;
    }

    const state: AlertState = { alertActive: false };
    this.alertStates.set(deviceId, state);
    return state;
  }

  private notifyAlert(notification: AlertNotification): void {
    this.alertListeners.forEach((listener) => listener(notification));
  }

  private extractDeviceId(topic: string): string | undefined {
    const parts = topic.split('/');
    return parts.length >= 3 && parts[0] === 'sentinelle' ? parts[2] : undefined;
  }

  private isThresholdExceeded(
    telemetry: TelemetryMessage,
    thresholds: ThresholdRow,
  ): boolean {
    const tempExceeded = telemetry.t < thresholds.tMin || telemetry.t > thresholds.tMax;
    const humidityExceeded =
      telemetry.h !== undefined &&
      (telemetry.h < thresholds.hMin || telemetry.h > thresholds.hMax);

    return tempExceeded || humidityExceeded;
  }
}
