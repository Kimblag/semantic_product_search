import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { ClientsModule } from './clients/clients.module';
import { RolesGuard } from './common/guards/roles.guard';
import appConfig from './config/app.config';
import { MongoModule } from './mongo/mongo.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';

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
    ClientsModule,
    AuditModule,
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
