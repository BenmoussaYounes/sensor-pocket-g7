import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ThresholdInput, ThresholdsService } from './thresholds.service';

@ApiTags('Thresholds')
@Controller('devices')
export class ThresholdsController {
  constructor(private readonly thresholdsService: ThresholdsService) {}

  @Get(':deviceId/thresholds')
  @ApiOperation({ summary: "Seuils d’alerte d’un device" })
  @ApiParam({ name: 'deviceId', description: 'Identifiant du device' })
  getThresholds(@Param('deviceId') deviceId: string) {
    const threshold = this.thresholdsService.getForDevice(deviceId);
    if (!threshold) {
      throw new NotFoundException(`Aucun seuil défini pour ${deviceId}`);
    }
    return threshold;
  }

  @Put(':deviceId/thresholds')
  @ApiOperation({ summary: 'Définir ou mettre à jour les seuils d’un device' })
  @ApiParam({ name: 'deviceId', description: 'Identifiant du device' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tMin', 'tMax', 'hMin', 'hMax', 'holdMinutes'],
      properties: {
        tMin: { type: 'number', example: 2 },
        tMax: { type: 'number', example: 8 },
        hMin: { type: 'number', example: 30 },
        hMax: { type: 'number', example: 60 },
        holdMinutes: { type: 'number', example: 15 },
      },
    },
  })
  setThresholds(
    @Param('deviceId') deviceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const payload = this.validatePayload(body);
    return this.thresholdsService.upsertForDevice(deviceId, payload);
  }

  private validatePayload(body: Record<string, unknown>): ThresholdInput {
    const required = ['tMin', 'tMax', 'hMin', 'hMax', 'holdMinutes'];
    for (const key of required) {
      if (!(key in body)) {
        throw new BadRequestException(`Le champ ${key} est obligatoire`);
      }
    }

    const payload: ThresholdInput = {
      tMin: Number(body.tMin),
      tMax: Number(body.tMax),
      hMin: Number(body.hMin),
      hMax: Number(body.hMax),
      holdMinutes: Number(body.holdMinutes),
    };

    if (Object.values(payload).some((value) => !Number.isFinite(value))) {
      throw new BadRequestException('Tous les seuils doivent être des nombres');
    }

    return payload;
  }
}
