import { ArrayUnique, IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @IsNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Each role ID must be a valid UUID v4' })
  roles: string[];
}
