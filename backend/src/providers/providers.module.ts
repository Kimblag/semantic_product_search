import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from 'src/audit/audit.module';
import { CsvModule } from 'src/csv/csv.module';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';
import { MongoModule } from 'src/mongo/mongo.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueModule } from 'src/queue/queue.module';
import { UploadsModule } from 'src/storage/uploads/uploads.module';
import { VectorDbModule } from 'src/vector-db/vector-db.module';
import { ProvidersCatalogService } from './application/providers-catalog.service';
import { ProvidersService } from './application/providers.service';
import { ProvidersController } from './controllers/providers.controller';
import { CatalogItem, CatalogItemSchema } from './schemas/provider-item.schema';

@Module({
  imports: [
    AuditModule,
    CsvModule,
    EmbeddingsModule,
    MongoModule,
    MongooseModule.forFeature([
      { name: CatalogItem.name, schema: CatalogItemSchema },
    ]),
    PrismaModule,
    UploadsModule,
    VectorDbModule,
    QueueModule,
  ],
  providers: [ProvidersService, ProvidersCatalogService],
  controllers: [ProvidersController],
})
export class ProvidersModule {}
