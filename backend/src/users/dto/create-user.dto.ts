import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'MiPassword123' })
  @IsString()
  @IsNotEmpty()
  contraseña: string;

  @ApiPropertyOptional({ example: 'Madrid' })
  @IsString()
  @IsOptional()
  ciudad?: string;

  @ApiPropertyOptional({ example: 'Me gusta el deporte' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: ['senderismo', 'fotografía'] })
  @IsArray()
  @IsOptional()
  intereses?: string[];
}
