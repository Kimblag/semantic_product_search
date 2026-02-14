import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : (value as string),
  )
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
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
