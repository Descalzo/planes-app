import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ example: 'Ruta en la Sierra' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiPropertyOptional({ example: 'Excursión de un día' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'senderismo' })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({ example: 'Madrid' })
  @IsString()
  @IsOptional()
  ciudad?: string;

  @ApiPropertyOptional({ example: '2026-06-10T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  fecha?: string;

  @ApiPropertyOptional({ example: 8, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  plazas?: number;
}
