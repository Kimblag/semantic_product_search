export class VectorDbException extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
    public readonly operation?: 'upsert' | 'delete' | 'query' | 'unknown',
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'VectorDbException';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VectorDbException);
    }
  }
}
