import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'Hola, me apunto a la ruta' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
