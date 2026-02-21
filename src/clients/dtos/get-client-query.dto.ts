import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class GetClientQueryDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  // add a default value of true for isActive
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
