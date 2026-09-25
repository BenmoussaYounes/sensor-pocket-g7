import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { LedController } from './led.controller';

@Module({
  imports: [MqttModule, EventsModule],
  controllers: [LedController],
})
export class LedModule {}
