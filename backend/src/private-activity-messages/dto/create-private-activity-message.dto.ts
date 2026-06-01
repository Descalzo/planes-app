import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePrivateActivityMessageDto {
  @ApiProperty({ example: 'Hola, queria preguntar por el punto de encuentro.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'Requerido cuando responde el creador', example: '64f1...' })
  @IsMongoId()
  @IsOptional()
  receiverId?: string;
}

