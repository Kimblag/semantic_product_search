import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { ClientsModule } from './clients/clients.module';
import { RolesGuard } from './common/guards/roles.guard';
import appConfig from './config/app.config';
import { CsvModule } from './csv/csv.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { MongoModule } from './mongo/mongo.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { VectorDbModule } from './vector-db/vector-db.module';
import { UploadsModule } from './storage/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        MONGO_URL: Joi.string().uri().required(),

        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ISSUER: Joi.string().required(),

        JWT_EXPIRES_IN: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN_SECONDS: Joi.string().required(),

        HASH_SALT_ROUNDS: Joi.number().integer().min(8).max(15).required(),
        HASH_SALT_ROUNDS_REFRESH: Joi.number()
          .integer()
          .min(8)
          .max(15)
          .required(),
        MAX_FAILED_ATTEMPTS: Joi.number().integer().min(1).max(10).required(),
        LOCK_TIME: Joi.number().integer().min(60000).max(3600000).required(), // 1 minute to 1 hour
        PINECONE_API_KEY: Joi.string().required(),
        PINECONE_REGION: Joi.string().required(),
        PINECONE_INDEX_NAME: Joi.string().required(),
        PINECONE_CLOUD: Joi.string().required(),
        EMBEDDINGS_MODEL: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().required(),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // miliseconds
          limit: 10, // max request per ttl
        },
      ],
    }),
    MongoModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    AuditModule,
    ClientsModule,
    ProvidersModule,
    RolesModule,
    VectorDbModule,
    EmbeddingsModule,
    CsvModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
