import {
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import {
  MqttService,
  TelemetryMessage,
} from '../mqtt/mqtt.service';

@WebSocketGateway({ path: '/ws/telemetry' })
export class TelemetryGateway
  implements OnGatewayConnection, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TelemetryGateway.name);
  private unsubscribe?: () => void;

  constructor(private readonly mqttService: MqttService) {}

  onModuleInit(): void {
    this.unsubscribe = this.mqttService.onTelemetry((topic, telemetry) => {
      this.broadcastTelemetry(topic, telemetry);
    });
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  handleConnection(): void {
    this.logger.log('Client WebSocket connecté pour la télémétrie');
  }

  private broadcastTelemetry(
    topic: string,
    telemetry: TelemetryMessage,
  ): void {
    const topicParts = topic.split('/');
    const deviceId = topicParts[2];
    const message = JSON.stringify({ deviceId, topic, ...telemetry });

    this.server?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}
