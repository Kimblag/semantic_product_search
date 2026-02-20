import { Test, TestingModule } from '@nestjs/testing';
import { FailedLoginService } from './failed-login.service';
import appConfig from 'src/config/app.config';
import { AuditService } from 'src/audit/audit.service';

const mockConfig = {
  security: {
    maxFailedAttempts: 3,
    lockTime: 60_000, // 1 minute in ms
    hashSaltRounds: 1,
    hashSaltRoundsRefresh: 1,
  },
  jwt: {
    secret: 'test-secret',
    refreshSecret: 'test-refresh-secret',
    expiresIn: '10m',
    refreshExpiresIn: '7d',
    issuer: 'test-issuer',
  },
};

const EMAIL = 'test@example.com';
const NOW = 1_000_000;

describe('FailedLoginService', () => {
  let service: FailedLoginService;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailedLoginService,
        { provide: appConfig.KEY, useValue: mockConfig },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<FailedLoginService>(FailedLoginService);

    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordFailure', () => {
    it('should record the first failure without locking', () => {
      service.recordFailure(EMAIL);

      const result = service.isLocked(EMAIL);
      expect(result.locked).toBe(false);
    });

    it('should lock the account after reaching max attempts', () => {
      for (let i = 0; i < mockConfig.security.maxFailedAttempts; i++) {
        service.recordFailure(EMAIL);
      }

      const result = service.isLocked(EMAIL);
      expect(result.locked).toBe(true);
    });

    it('should accumulate attempts across multiple calls', () => {
      service.recordFailure(EMAIL);
      service.recordFailure(EMAIL);

      // One attempt short of locking (maxFailedAttempts = 3)
      const result = service.isLocked(EMAIL);
      expect(result.locked).toBe(false);

      service.recordFailure(EMAIL);
      expect(service.isLocked(EMAIL).locked).toBe(true);
    });

    it('should track attempts independently per email', () => {
      const OTHER_EMAIL = 'other@example.com';

      for (let i = 0; i < mockConfig.security.maxFailedAttempts; i++) {
        service.recordFailure(EMAIL);
      }

      expect(service.isLocked(EMAIL).locked).toBe(true);
      expect(service.isLocked(OTHER_EMAIL).locked).toBe(false);
    });
  });

  describe('resetAttempts', () => {
    it('should clear the lock after reset', () => {
      for (let i = 0; i < mockConfig.security.maxFailedAttempts; i++) {
        service.recordFailure(EMAIL);
      }
      expect(service.isLocked(EMAIL).locked).toBe(true);

      service.resetAttempts(EMAIL);

      expect(service.isLocked(EMAIL).locked).toBe(false);
    });

    it('should not throw if resetting a non-existent email', () => {
      expect(() => service.resetAttempts('unknown@example.com')).not.toThrow();
    });
  });

  describe('isLocked', () => {
    it('should return locked false for unknown email', () => {
      const result = service.isLocked('unknown@example.com');

      expect(result).toEqual({ locked: false, remainingMs: 0 });
    });

    it('should return locked true with remainingMs when account is locked', () => {
      for (let i = 0; i < mockConfig.security.maxFailedAttempts; i++) {
        service.recordFailure(EMAIL);
      }

      const result = service.isLocked(EMAIL);

      expect(result.locked).toBe(true);
      expect(result.remainingMs).toBe(mockConfig.security.lockTime);
    });

    it('should return locked false and clean up the entry when lock has expired', () => {
      for (let i = 0; i < mockConfig.security.maxFailedAttempts; i++) {
        service.recordFailure(EMAIL);
      }

      // Advance time past the lock expiry
      dateNowSpy.mockReturnValue(NOW + mockConfig.security.lockTime + 1);

      const result = service.isLocked(EMAIL);

      expect(result.locked).toBe(false);
      expect(result.remainingMs).toBe(0);
    });

    it('should return correct remainingMs as time passes', () => {
      for (let i = 0; i < mockConfig.security.maxFailedAttempts; i++) {
        service.recordFailure(EMAIL);
      }

      const elapsed = 20_000;
      dateNowSpy.mockReturnValue(NOW + elapsed);

      const result = service.isLocked(EMAIL);

      expect(result.locked).toBe(true);
      expect(result.remainingMs).toBe(mockConfig.security.lockTime - elapsed);
    });
  });
});
