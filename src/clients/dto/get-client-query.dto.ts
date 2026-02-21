import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class GetClientQueryDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
