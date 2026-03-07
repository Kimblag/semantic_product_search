export interface FailedAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}
