import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MeasurementsService } from './measurements.service';

@ApiTags('Mesures')
@Controller('devices')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get(':deviceId/measurements')
  @ApiOperation({ summary: "Historique des mesures d'un device" })
  @ApiParam({ name: 'deviceId', description: 'Identifiant du device' })
  @ApiQuery({
    name: 'from',
    description: 'Timestamp de début (ms epoch)',
    required: true,
  })
  @ApiQuery({
    name: 'to',
    description: 'Timestamp de fin (ms epoch)',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre max de lignes renvoyées (défaut 100, max 1000)',
  })
  getHistory(
    @Param('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    const fromTs = Number(from);
    const toTs = Number(to);

    if (
      !deviceId.trim() ||
      !Number.isFinite(fromTs) ||
      !Number.isFinite(toTs)
    ) {
      throw new BadRequestException(
        'deviceId, from et to (timestamps numériques) sont obligatoires',
      );
    }

    const parsedLimit = limit ? Number(limit) : 100;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 1000)
      : 100;

    return this.measurementsService.findByDeviceAndRange(
      deviceId,
      fromTs,
      toTs,
      safeLimit,
    );
  }
}
