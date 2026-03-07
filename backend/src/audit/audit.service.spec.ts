import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditAction } from './enums/audit-action.enum';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog } from './audit.schema';

const createAuditLogModelMock = () => ({
  create: jest.fn(),
});

describe('AuditService', () => {
  let service: AuditService;
  let auditLogModel: ReturnType<typeof createAuditLogModelMock>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    auditLogModel = createAuditLogModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken(AuditLog.name),
          useValue: auditLogModel,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should persist an audit event with all fields', async () => {
      auditLogModel.create.mockResolvedValue({});

      await service.log({
        action: AuditAction.LOGIN_SUCCESS,
        userId: 'user-uuid-123',
        targetUserId: 'target-uuid-456',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { key: 'value' },
      });

      expect(auditLogModel.create).toHaveBeenCalledWith({
        action: AuditAction.LOGIN_SUCCESS,
        userId: 'user-uuid-123',
        targetUserId: 'target-uuid-456',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { key: 'value' },
      });
    });

    it('should persist only defined fields when optional fields are absent', async () => {
      auditLogModel.create.mockResolvedValue({});

      await service.log({ action: AuditAction.LOGIN_FAILED });

      const expectedCall = { action: AuditAction.LOGIN_FAILED };
      expect(auditLogModel.create).toHaveBeenCalledWith(expectedCall);
      expect(auditLogModel.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: expect.anything() as unknown }),
      );
      expect(auditLogModel.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ targetUserId: expect.anything() as unknown }),
      );
      expect(auditLogModel.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ ip: expect.anything() as unknown }),
      );
      expect(auditLogModel.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: expect.anything() as unknown }),
      );
      expect(auditLogModel.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.anything() as unknown }),
      );
    });

    it('should not throw if auditLogModel.create fails', async () => {
      auditLogModel.create.mockRejectedValue(new Error('db error'));

      await expect(
        service.log({ action: AuditAction.LOGIN_SUCCESS }),
      ).resolves.not.toThrow();
    });

    it('should log the error if auditLogModel.create fails', async () => {
      const dbError = new Error('db error');
      auditLogModel.create.mockRejectedValue(dbError);

      await service.log({ action: AuditAction.LOGIN_SUCCESS });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[AUDIT_SERVICE]: Failed to log audit event',
        dbError,
      );
    });
  });
});
