import { Expose } from 'class-transformer';

export class CurrentUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  roles: string[];
}
