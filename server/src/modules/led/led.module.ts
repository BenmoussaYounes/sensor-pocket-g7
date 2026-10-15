import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { LedController } from './led.controller';

@Module({
  imports: [MqttModule, EventsModule, AuthModule],
  controllers: [LedController],
})
export class LedModule {}
