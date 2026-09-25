import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [MqttModule, EventsModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}