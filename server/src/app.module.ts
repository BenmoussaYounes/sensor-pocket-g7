import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DatabaseModule } from './modules/database/database.module';
import { DevicesModule } from './modules/devices/devices.module';
import { EventsModule } from './modules/events/events.module';
import { LedModule } from './modules/led/led.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { ThresholdsModule } from './modules/thresholds/thresholds.module';

@Module({
  imports: [
    DatabaseModule,
    MqttModule,
    DevicesModule,
    EventsModule,
    AlertsModule,
    LedModule,
    TelemetryModule,
    MeasurementsModule,
    ThresholdsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
