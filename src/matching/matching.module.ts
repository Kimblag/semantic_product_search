import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { VectorDbModule } from 'src/vector-db/vector-db.module';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MongoModule } from 'src/mongo/mongo.module';
import {
  MatchingResult,
  MatchingResultSchema,
} from './schemas/requirement-root-document.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    AuditModule,
    EmbeddingsModule,
    MongoModule,
    MongooseModule.forFeature([
      { name: MatchingResult.name, schema: MatchingResultSchema },
    ]),
    PrismaModule,
    VectorDbModule,
  ],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
