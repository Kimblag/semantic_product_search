import { Expose } from 'class-transformer';

export class RoleResponseDto {
  @Expose()
  id: string;
  @Expose()
  name: string;
}

export class UserResponseDto {
  @Expose()
  id: string;
  @Expose()
  email: string;
  @Expose()
  name: string;
  @Expose()
  roles: RoleResponseDto[];
  @Expose()
  active: boolean;
  @Expose()
  createdAt: Date;
}
