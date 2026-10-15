import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ThresholdsController } from './thresholds.controller';
import { ThresholdsService } from './thresholds.service';

@Module({
  imports: [AuthModule],
  controllers: [ThresholdsController],
  providers: [ThresholdsService],
  exports: [ThresholdsService],
})
export class ThresholdsModule {}
