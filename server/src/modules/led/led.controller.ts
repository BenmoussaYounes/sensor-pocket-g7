import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from '../events/events.service';
import { MqttService } from '../mqtt/mqtt.service';
import { SetLedDto } from './dto/set-led.dto';

@ApiTags('LED')
@Controller('devices')
export class LedController {
  constructor(
    private readonly mqttService: MqttService,
    private readonly eventsService: EventsService,
  ) {}

  @Post(':deviceId/led')
  @ApiOperation({ summary: 'Allumer ou éteindre la LED d’un device' })
  @ApiParam({ name: 'deviceId', description: 'Identifiant du device' })
  @ApiBody({
    type: SetLedDto,
    examples: {
      allumer: { value: { on: true } },
      eteindre: { value: { on: false } },
    },
  })
  @ApiResponse({ status: 201, description: 'Commande LED envoyée' })
  @ApiBadRequestResponse({ description: 'Le champ on doit être booléen' })
  @ApiServiceUnavailableResponse({ description: 'MQTT est indisponible' })
  setLed(@Param('deviceId') deviceId: string, @Body() body: SetLedDto) {
    if (!deviceId.trim() || typeof body?.on !== 'boolean') {
      throw new BadRequestException(
        'deviceId et on (booléen) sont obligatoires',
      );
    }

    try {
      const result = this.mqttService.setLed(deviceId, body.on);
      this.eventsService.record(deviceId, 'led_command', {
        deviceId,
        on: body.on,
        topic: result.topic,
        payload: result.payload,
      });
      return { deviceId, on: body.on, ...result };
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'MQTT indisponible',
      );
    }
  }
}
