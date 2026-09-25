import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'État courant des devices' })
  findAll() {
    return this.devicesService.findAll();
  }

  @Get(':deviceId')
  @ApiOperation({ summary: "État courant d'un device" })
  @ApiParam({ name: 'deviceId', description: "Identifiant de l'appareil" })
  findOne(@Param('deviceId') deviceId: string) {
    const device = this.devicesService.findOne(deviceId);
    if (!device) {
      throw new NotFoundException(`Device introuvable : ${deviceId}`);
    }
    return device;
  }
}