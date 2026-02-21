import { IsBoolean, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class GetUsersQueryDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID('4', { message: 'roleId must be a valid UUID v4' })
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
