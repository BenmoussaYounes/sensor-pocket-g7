import { Module } from '@nestjs/common';
import { MqttModule } from '../mqtt/mqtt.module';
import { LedController } from './led.controller';

@Module({
  imports: [MqttModule],
  controllers: [LedController],
})
export class LedModule {}
