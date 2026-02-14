import { IsString, MinLength } from 'class-validator';

export class PasswordBaseDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}

export class ChangeUserPasswordDto extends PasswordBaseDto {
  @IsString()
  @MinLength(8)
  currentPassword: string;
}
export class ResetUserPasswordDto extends PasswordBaseDto {}
