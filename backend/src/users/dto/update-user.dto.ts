import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Madrid' })
  @IsString()
  @IsOptional()
  ciudad?: string;

  @ApiPropertyOptional({ example: 'Me gusta el deporte y viajar', maxLength: 300 })
  @IsString()
  @MaxLength(300, { message: 'La bio no puede superar 300 caracteres' })
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: ['senderismo', 'fotografia'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  intereses?: string[];

  @ApiPropertyOptional({ example: 'https://example.com/foto.jpg' })
  @IsUrl({}, { message: 'fotoPerfilUrl debe ser una URL valida' })
  @IsOptional()
  fotoPerfilUrl?: string;

  @ApiPropertyOptional({ example: 28 })
  @IsInt()
  @Min(13)
  @Max(120)
  @IsOptional()
  edad?: number;

  @ApiPropertyOptional({ example: 'No binario' })
  @IsString()
  @IsOptional()
  genero?: string;

  @ApiPropertyOptional({ example: 'juan_perez' })
  @IsString()
  @IsOptional()
  instagram?: string;
}
