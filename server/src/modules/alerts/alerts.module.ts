import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { ThresholdsModule } from '../thresholds/thresholds.module';
import { AlertsService } from './alerts.service';

@Module({
  imports: [MqttModule, ThresholdsModule, EventsModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
