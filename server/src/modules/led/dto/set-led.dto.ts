import { ApiProperty } from '@nestjs/swagger';

export class SetLedDto {
  @ApiProperty({
    description: 'true pour allumer, false pour éteindre',
    example: true,
  })
  on!: boolean;
}
