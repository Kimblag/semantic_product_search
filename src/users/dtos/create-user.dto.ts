import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : (value as string),
  )
  email: string;

  // Password must be at least 12 characters long and include uppercase letters,
  // lowercase letters, numbers, and special characters
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  @Matches(/[A-Z]/)
  @Matches(/[a-z]/)
  @Matches(/[0-9]/)
  @Matches(/[^A-Za-z0-9]/)
  password: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : (value as string),
  )
  name: string;

  @IsArray()
  @IsNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Each role ID must be a valid UUID v4' })
  roles: string[];
}
