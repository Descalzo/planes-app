import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({ example: 'Ruta en la Sierra' })
  titulo: string;

  @ApiPropertyOptional({ example: 'Excursión de un día' })
  descripcion?: string;

  @ApiPropertyOptional({ example: 'senderismo' })
  categoria?: string;

  @ApiPropertyOptional({ example: 'Madrid' })
  ciudad?: string;

  @ApiPropertyOptional({ example: '2026-06-10T09:00:00.000Z' })
  fecha?: Date;

  @ApiPropertyOptional({ example: 8 })
  plazas?: number;
}
