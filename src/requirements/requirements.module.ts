import { Module } from '@nestjs/common';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';
import { UploadsModule } from 'src/storage/uploads/uploads.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from 'src/audit/audit.module';
import { CsvModule } from 'src/csv/csv.module';
import { MatchingModule } from 'src/matching/matching.module';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [
    UploadsModule,
    PrismaModule,
    AuditModule,
    CsvModule,
    MatchingModule,
    UploadsModule,
    QueueModule,
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService],
})
export class RequirementsModule {}
