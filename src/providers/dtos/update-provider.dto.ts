import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProviderDto {
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
  @IsString()
  telephone?: string | undefined;

  @IsOptional()
  @IsString()
  address?: string | undefined;

  @IsOptional()
  @IsBoolean()
  active?: boolean | undefined;
}
