import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QUEUE_CONCURRENCY } from './constants/queue.constants';

@Module({
  providers: [
    {
      provide: QUEUE_CONCURRENCY,
      useValue: 2,
    },
    {
      provide: QueueService,
      useFactory: (concurrency: number) => new QueueService(concurrency),
      inject: [QUEUE_CONCURRENCY],
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}
