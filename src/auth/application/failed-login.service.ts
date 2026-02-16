import { Inject, Injectable } from '@nestjs/common';
import { FailedAttempt } from '../interfaces/failed-login.interface';
import { IsLockedLogin } from '../dto/failed-login-response.dto';
import { ConfigType } from '@nestjs/config';
import appConfig from 'src/config/app.config';

@Injectable()
export class FailedLoginService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}
  private attempts: Map<string, FailedAttempt> = new Map();

  private readonly MAX_ATTEMPTS = this.config.security.maxFailedAttempts;
  private readonly LOCK_TIME = this.config.security.lockTime;

  recordFailure(email: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(email) || { count: 0, lastAttempt: now };
    attempt.count++;
    attempt.lastAttempt = now;

    if (attempt.count >= this.MAX_ATTEMPTS) {
      attempt.lockedUntil = now + this.LOCK_TIME;
    }

    this.attempts.set(email, attempt);
  }

  resetAttempts(email: string): void {
    this.attempts.delete(email);
  }

  isLocked(email: string): IsLockedLogin {
    const attempt = this.attempts.get(email);

    if (!attempt || !attempt.lockedUntil)
      return { locked: false, remainingMs: 0 };

    const now = Date.now();

    if (now > attempt.lockedUntil) {
      this.attempts.delete(email);
      return { locked: false, remainingMs: 0 };
    }

    return { locked: true, remainingMs: attempt.lockedUntil - now };
  }
}
