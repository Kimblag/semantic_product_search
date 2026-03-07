import { Module } from '@nestjs/common';
import { RequirementsService } from './application/requirements.service';
import { RequirementsController } from './controllers/requirements.controller';
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
    QueueModule,
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService],
})
export class RequirementsModule {}
