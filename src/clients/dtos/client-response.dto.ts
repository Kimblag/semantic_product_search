import { Expose } from 'class-transformer';

export class ClientResponseDto {
  @Expose()
  id: string;
  @Expose()
  name: string;
  @Expose()
  email: string;
  @Expose()
  telephone: string;
  @Expose()
  address: string;
  @Expose()
  active: boolean;
  @Expose()
  createdAt: Date;
}
