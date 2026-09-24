import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { LedModule } from './modules/led/led.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';

@Module({
  imports: [
    DatabaseModule,
    MqttModule,
    LedModule,
    TelemetryModule,
    MeasurementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
