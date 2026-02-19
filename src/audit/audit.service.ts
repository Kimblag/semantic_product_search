import { Injectable, Logger } from '@nestjs/common';
import { AuditLogInput } from './inputs/log-audit.input';
import { InjectModel } from '@nestjs/mongoose';
import { AuditLog, AuditLogDocument } from './audit.schema';
import { Model } from 'mongoose';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(command: AuditLogInput): Promise<void> {
    try {
      await this.auditLogModel.create({
        action: command.action,
        ...(command.userId && { userId: command.userId }),
        ...(command.targetUserId && { targetUserId: command.targetUserId }),
        ...(command.ip && { ip: command.ip }),
        ...(command.userAgent && { userAgent: command.userAgent }),
        ...(command.metadata && { metadata: command.metadata }),
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
    }
  }
}
