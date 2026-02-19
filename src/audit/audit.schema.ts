import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditAction } from './enums/audit-action.enum';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs', versionKey: false, timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AuditAction, index: true })
  action: AuditAction;

  @Prop({ required: false, index: true })
  userId: string | null;

  @Prop({ required: false, index: true })
  targetUserId: string | null;

  @Prop({ required: false })
  ip: string | null;

  @Prop({ required: false })
  userAgent: string | null;

  @Prop({ required: false, type: Object })
  metadata: Record<string, unknown> | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// ttl index to automatically delete logs after 90 days
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);
