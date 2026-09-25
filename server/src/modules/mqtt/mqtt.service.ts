import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';

export interface TelemetryMessage {
  ts: number;
  t: number;
  h?: number;
  seq: number;
}

type TelemetryListener = (topic: string, telemetry: TelemetryMessage) => void;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private readonly telemetryListeners = new Set<TelemetryListener>();
  private client?: MqttClient;
  private group?: string;

  onTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  onModuleInit(): void {
    const brokerUrl = process.env.MQTT_URL;
    const group = process.env.MQTT_GROUP;

    if (!brokerUrl || !group) {
      this.logger.warn(
        'MQTT désactivé : définissez MQTT_URL et MQTT_GROUP dans le fichier .env',
      );
      return;
    }

    this.group = group;

    const telemetryTopic = `sentinelle/${group}/+/telemetry`;
    const statusTopic = `sentinelle/${group}/+/status`;
    const configuredClientId =
      process.env.MQTT_CLIENT_ID || `serveur-${group}`;
    const clientId = `${configuredClientId}-${process.pid}`;

    this.client = mqtt.connect(brokerUrl, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connecté au broker MQTT ${brokerUrl}`);
      this.client?.subscribe([telemetryTopic, statusTopic], (error) => {
        if (error) {
          this.logger.error(`Abonnement MQTT impossible : ${error.message}`);
          return;
        }
        this.logger.log(`Écoute de ${telemetryTopic} et ${statusTopic}`);
      });
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });

    this.client.on('error', (error) => {
      this.logger.error(`Erreur MQTT : ${error.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconnexion au broker MQTT...');
    });
  }

  onModuleDestroy(): void {
    this.client?.end();
  }

  setLed(deviceId: string, on: boolean): { topic: string; payload: string } {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT non connecté : impossible d’envoyer la commande');
    }
    if (!this.group) {
      throw new Error('Groupe MQTT non défini');
    }

    const topic = `sentinelle/${this.group}/${deviceId}/cmd`;
    const payload = JSON.stringify({ led: on });

    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`Échec publication sur ${topic} : ${error.message}`);
      } else {
        this.logger.log(`Commande envoyée sur ${topic} : ${payload}`);
      }
    });

    return { topic, payload };
  }

  private handleMessage(topic: string, rawPayload: string): void {
    if (topic.endsWith('/status')) {
      this.logger.log(`Statut reçu sur ${topic} : ${rawPayload.trim()}`);
      return;
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawPayload);
    } catch {
      this.logger.warn(`Message MQTT ignoré (JSON invalide) sur ${topic}`);
      return;
    }

    if (topic.endsWith('/telemetry')) {
      if (!this.isTelemetry(payload)) {
        this.logger.warn(`Mesure MQTT invalide sur ${topic}`);
        return;
      }

      this.logger.log(
        `Température reçue : ${payload.t} °C` +
          (payload.h === undefined ? '' : `, humidité : ${payload.h} %`),
      );
      this.telemetryListeners.forEach((listener) => listener(topic, payload));
      return;
    }

  }

  private isTelemetry(payload: unknown): payload is TelemetryMessage {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const message = payload as Record<string, unknown>;
    return (
      typeof message.ts === 'number' &&
      Number.isFinite(message.ts) &&
      typeof message.t === 'number' &&
      Number.isFinite(message.t) &&
      typeof message.seq === 'number' &&
      Number.isInteger(message.seq) &&
      message.seq >= 0 &&
      (message.h === undefined ||
        (typeof message.h === 'number' && Number.isFinite(message.h)))
    );
  }
}
