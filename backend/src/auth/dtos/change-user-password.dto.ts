import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class PasswordBaseDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  @Matches(/[A-Z]/)
  @Matches(/[a-z]/)
  @Matches(/[0-9]/)
  @Matches(/[^A-Za-z0-9]/)
  newPassword: string;
}

export class ChangeUserPasswordDto extends PasswordBaseDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;
}
export class ResetUserPasswordDto extends PasswordBaseDto {}
