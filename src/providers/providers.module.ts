import { Module } from '@nestjs/common';
import { ProvidersService } from './application/providers.service';
import { ProvidersController } from './controllers/providers.controller';
import { ProvidersCatalogService } from './application/providers-catalog.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VectorDbModule } from 'src/vector-db/vector-db.module';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';
import { CsvModule } from 'src/csv/csv.module';
import { UploadsModule } from 'src/storage/uploads/uploads.module';
import { CatalogItem, CatalogItemSchema } from './schemas/provider-item.schema';
import { MongoModule } from 'src/mongo/mongo.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    VectorDbModule,
    EmbeddingsModule,
    CsvModule,
    UploadsModule,
    MongoModule,
    MongooseModule.forFeature([
      { name: CatalogItem.name, schema: CatalogItemSchema },
    ]),
    AuditModule,
  ],
  providers: [ProvidersService, ProvidersCatalogService],
  controllers: [ProvidersController],
})
export class ProvidersModule {}
