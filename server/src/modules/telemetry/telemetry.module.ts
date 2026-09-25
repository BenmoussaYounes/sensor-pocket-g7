import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { TelemetryGateway } from './telemetry.gateway';

@Module({
  imports: [MqttModule, AlertsModule],
  providers: [TelemetryGateway],
})
export class TelemetryModule {}
