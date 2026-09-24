import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LedModule } from './modules/led/led.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';

@Module({
  imports: [MqttModule, LedModule, TelemetryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
