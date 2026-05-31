import { IsString, IsOptional } from 'class-validator';

export class JoinActivityDto {
  @IsString()
  @IsOptional()
  usuario?: string;
}
