import { IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class IsLockedLogin {
  @IsBoolean()
  @IsNotEmpty()
  locked: boolean;

  @IsNumber()
  remainingMs: number;
}
