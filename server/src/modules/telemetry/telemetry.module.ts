import { Module } from '@nestjs/common';
import { MqttModule } from '../mqtt/mqtt.module';
import { TelemetryGateway } from './telemetry.gateway';

@Module({
  imports: [MqttModule],
  providers: [TelemetryGateway],
})
export class TelemetryModule {}
