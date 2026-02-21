import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GetProviderQueryDto {
  @IsOptional()
  @IsString()
  code?: string | undefined;

  @IsOptional()
  @IsString()
  name?: string | undefined;

  @IsOptional()
  @IsString()
  email?: string | undefined;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;
}
