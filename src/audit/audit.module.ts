import { Module } from '@nestjs/common';
import { MongoModule } from 'src/mongo/mongo.module';
import { AuditService } from './audit.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit.schema';

@Module({
  imports: [
    MongoModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
