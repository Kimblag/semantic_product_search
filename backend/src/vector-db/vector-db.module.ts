import { Module } from '@nestjs/common';
import { VectorDbService } from './vector-db.service';
import { Pinecone } from '@pinecone-database/pinecone';
import appConfig from 'src/config/app.config';

@Module({
  providers: [
    // provide VECTOR_DB client to expose to all the applicaion
    {
      provide: 'PINECONE_CLIENT',
      useFactory: () => {
        return new Pinecone({
          apiKey: appConfig().vectorDb.apiKey,
        });
      },
    },
    VectorDbService,
  ],
  exports: ['PINECONE_CLIENT', VectorDbService],
})
export class VectorDbModule {}
