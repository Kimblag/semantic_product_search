import { AuditAction } from '../enums/audit-action.enum';

export type AuditLogInput = {
  action: AuditAction;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
  userAgent?: string | null;
  userId?: string | null;
  targetUserId?: string | null;
};
