import { Inject, Injectable } from '@nestjs/common';
import { Job } from './types/queue-job.type';
import { QUEUE_CONCURRENCY } from './constants/queue.constants';

@Injectable()
export class QueueService {
  private queue: Job[] = [];
  private activeCount = 0;

  constructor(@Inject(QUEUE_CONCURRENCY) private concurrency: number) {}

  add<T>(job: Job<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedJob = async () => {
        try {
          const result = await job();
          resolve(result);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        } finally {
          this.activeCount--;
          this.next();
        }
      };

      this.queue.push(wrappedJob);
      this.next();
    });
  }

  private next() {
    if (this.activeCount >= this.concurrency) return;
    const job = this.queue.shift();
    if (!job) return;

    this.activeCount++;
    void job();
  }
}
