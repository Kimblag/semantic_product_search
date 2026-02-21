import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class GetUsersQueryDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID('4', { message: 'roleId must be a valid UUID v4' })
  roleId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean = true;
}
