import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller('devices')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get(':deviceId/events')
  @ApiOperation({ summary: 'Historique des événements pour un device' })
  @ApiParam({ name: 'deviceId', description: 'Identifiant du device' })
  @ApiQuery({ name: 'from', required: true, description: 'Timestamp de début' })
  @ApiQuery({ name: 'to', required: true, description: 'Timestamp de fin' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtre optionnel sur le type d’événement' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre max d’événements' })
  getEvents(
    @Param('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type?: string,
    @Query('limit') limit = '100',
  ) {
    const fromTs = Number(from);
    const toTs = Number(to);
    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 1000) : 100;

    return this.eventsService.findByDeviceAndRange(
      deviceId,
      fromTs,
      toTs,
      type,
      safeLimit,
    );
  }
}
