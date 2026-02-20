import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { AuditLogInput } from 'src/audit/inputs/log-audit.input';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/application/users.service';
import { TooManyRequestException } from '../exceptions/too-many-request.exception';
import { AuthService } from './auth.service';
import { FailedLoginService } from './failed-login.service';

/* Mock factories */

// jwt service
const createJwtServiceMock = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
});

const createUserServiceMock = () => ({
  findUserAuthByEmail: jest.fn(),
  findUserAuthById: jest.fn(),
  verifyPassword: jest.fn(),
  updatePassword: jest.fn(),
});

const createPrismaServiceMock = () => ({
  refreshToken: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
});

const createFailedLoginServiceMock = () => ({
  recordFailure: jest.fn(),
  resetAttempts: jest.fn(),
  isLocked: jest.fn(),
});

const createAuditServiceMock = () => ({
  log: jest.fn(),
});

const mockConfig = {
  jwt: {
    secret: 'test-secret',
    refreshSecret: 'test-refresh-secret',
    expiresIn: '10m',
    refreshExpiresIn: '7d',
    issuer: 'test-issuer',
  },
  security: {
    hashSaltRoundsRefresh: 1, // a low value for testing purposes
    hashSaltRounds: 1,
    lockTime: 15,
    maxFailedAttempts: 5,
  },
};

/* Mock data */
const mockActiveUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  active: true,
  roles: [{ rol: { name: 'user' } }, { rol: { name: 'admin' } }],
};

const mockLoginInput = {
  email: 'test@example.com',
  password: 'plainPassword123',
  ip: '127.0.0.1',
  ua: 'Mozilla/5.0',
};

describe('AuthService Tests', () => {
  let authService: AuthService;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let usersService: ReturnType<typeof createUserServiceMock>;
  let prismaService: ReturnType<typeof createPrismaServiceMock>;
  let failedLoginService: ReturnType<typeof createFailedLoginServiceMock>;
  let auditService: ReturnType<typeof createAuditServiceMock>;

  beforeEach(async () => {
    // create mock instances
    jwtService = createJwtServiceMock();
    usersService = createUserServiceMock();
    prismaService = createPrismaServiceMock();
    failedLoginService = createFailedLoginServiceMock();
    auditService = createAuditServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // mocks
        { provide: JwtService, useValue: jwtService },
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prismaService },
        { provide: FailedLoginService, useValue: failedLoginService },
        { provide: AuditService, useValue: auditService },
        { provide: appConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // clean all the mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  /* SignIn */

  describe('signIn', () => {
    beforeEach(() => {
      // happy path by default
      failedLoginService.isLocked.mockReturnValue({ locked: false });
      usersService.findUserAuthByEmail.mockResolvedValue(mockActiveUser);
      usersService.verifyPassword.mockResolvedValue(true);
      // mockResolvedValueOnce allows us to return different values on subsequent calls,
      //  which is useful for testing both access and refresh token generation
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      prismaService.refreshToken.create.mockResolvedValue({});
      auditService.log.mockResolvedValue(undefined);
    });

    it('should sign in successfully with valid credentials', async () => {
      const result = await authService.signIn(mockLoginInput);

      // verify result
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      // verify side effects
      expect(failedLoginService.resetAttempts).toHaveBeenCalledWith(
        mockLoginInput.email,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ACCOUNT_UNLOCKED }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_SUCCESS,
          userId: mockActiveUser.id,
        }),
      );
    });

    it('should throw TooManyRequestException if account is locked due to too many attempts', async () => {
      failedLoginService.isLocked.mockReturnValue({
        locked: true,
        remainingMs: 900_000, // 15 minutes in ms
      });

      await expect(authService.signIn(mockLoginInput)).rejects.toThrow(
        TooManyRequestException,
      );

      // if is blocked it doesn't even query the database for the user
      expect(usersService.findUserAuthByEmail).not.toHaveBeenCalled();

      // It should still audit the attempt on a locked account
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining<Partial<AuditLogInput>>({
          action: AuditAction.ACCOUNT_LOCKED,
          metadata: expect.objectContaining<{ email: string }>({
            email: mockLoginInput.email,
          }) as Partial<AuditLogInput>,
        }),
      );
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      usersService.findUserAuthByEmail.mockResolvedValue(null);

      await expect(authService.signIn(mockLoginInput)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(failedLoginService.recordFailure).toHaveBeenCalledWith(
        mockLoginInput.email,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_FAILED,
          metadata: expect.objectContaining({
            email: mockLoginInput.email,
          }) as Partial<AuditLogInput>,
        }),
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      usersService.findUserAuthByEmail.mockResolvedValue({
        ...mockActiveUser,
        active: false,
      });

      await expect(authService.signIn(mockLoginInput)).rejects.toThrow(
        UnauthorizedException,
      );

      // Same behavior as user not found: records failure and audits
      expect(failedLoginService.recordFailure).toHaveBeenCalledWith(
        mockLoginInput.email,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN_FAILED }),
      );
      // Should not have attempted to verify the password
      expect(usersService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      usersService.verifyPassword.mockResolvedValue(false);

      await expect(authService.signIn(mockLoginInput)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(failedLoginService.recordFailure).toHaveBeenCalledWith(
        mockLoginInput.email,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN_FAILED }),
      );
      // Should not have generated tokens
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  /* Test refresh tokens */
  describe('refreshToken', () => {
    const RAW_REFRESH_TOKEN = 'raw-refresh-token';

    const mockRefreshInput = {
      oldToken: RAW_REFRESH_TOKEN,
      ip: '127.0.0.1',
      ua: 'Mozilla/5.0',
    };

    // The record that Prisma returns when searching by jti.
    // tokenHash is generated in the beforeEach with a real hash of RAW_REFRESH_TOKEN.
    let mockTokenRecord: {
      id: string;
      userId: string;
      jti: string;
      tokenHash: string;
      revoked: boolean;
      expiresAt: Date;
      ipAddress: string;
      userAgent: string;
    };

    beforeEach(async () => {
      // Generate a real hash with saltRounds: 1 (fast) so that bcrypt.compare
      // works for real. This makes the test faithful to the real service behavior.
      const tokenHash = await bcrypt.hash(RAW_REFRESH_TOKEN, 1);

      mockTokenRecord = {
        id: 'token-uuid-456',
        userId: mockActiveUser.id,
        jti: 'jti-uuid-789',
        tokenHash,
        revoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in the future
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      // Happy path
      jwtService.verifyAsync.mockResolvedValue({
        sub: mockActiveUser.id,
        jti: mockTokenRecord.jti,
      });
      prismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      prismaService.refreshToken.update.mockResolvedValue({});
      prismaService.refreshToken.create.mockResolvedValue({});
      usersService.findUserAuthById.mockResolvedValue(mockActiveUser);
      // signAsync: first the new refresh token, then the access token.
      // The order comes from generateRefreshToken (which calls signAsync first)
      // followed by generateAccessToken.
      jwtService.signAsync
        .mockResolvedValueOnce('new-mock-refresh-token')
        .mockResolvedValueOnce('new-mock-access-token');
      auditService.log.mockResolvedValue(undefined);
    });

    it('should return new tokens and revoke old token on valid refresh token', async () => {
      const result = await authService.refreshToken(mockRefreshInput);

      expect(result).toEqual({
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
      });

      // The old token should be revoked with replacedBy pointing to the new jti
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTokenRecord.id },
          data: expect.objectContaining({
            revoked: true,
            replacedBy: expect.any(String) as unknown,
          }) as unknown,
        }),
      );

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.REFRESH_TOKEN_ISSUED,
          userId: mockActiveUser.id,
        }),
      );
    });

    it('should throw UnauthorizedException if jwt signature is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );

      // With invalid signature, the database should not be touched
      expect(prismaService.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token record is not found', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token is already revoked', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockTokenRecord,
        revoked: true,
      });

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );

      // A revoked token should not result in new tokens
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      });

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token hash does not match', async () => {
      // The record has a hash that does not match the presented token.
      // Simulates a stolen or tampered token.
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockTokenRecord,
        tokenHash: await bcrypt.hash('completely-different-token', 1),
      });

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not found after token validation', async () => {
      usersService.findUserAuthById.mockResolvedValue(null);

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive after token validation', async () => {
      usersService.findUserAuthById.mockResolvedValue({
        ...mockActiveUser,
        active: false,
      });

      await expect(authService.refreshToken(mockRefreshInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changeUserPassword', () => {
    const mockChangeInput = {
      userId: mockActiveUser.id,
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword456',
    };

    beforeEach(() => {
      usersService.findUserAuthById.mockResolvedValue(mockActiveUser);
      usersService.verifyPassword.mockResolvedValue(true);
      usersService.updatePassword.mockResolvedValue(undefined);
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      auditService.log.mockResolvedValue(undefined);
    });

    it('should change password, revoke all tokens, and log audit on success', async () => {
      await authService.changeUserPassword(mockChangeInput);

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockChangeInput.userId,
        mockChangeInput.newPassword,
      );

      // Verify that revokeAllUserTokens invalidated all active sessions
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockChangeInput.userId, revoked: false },
        data: { revoked: true },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_CHANGED,
          userId: mockChangeInput.userId,
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      usersService.findUserAuthById.mockResolvedValue(null);

      await expect(
        authService.changeUserPassword(mockChangeInput),
      ).rejects.toThrow(NotFoundException);

      // If the user does not exist, nothing else should be touched
      expect(usersService.verifyPassword).not.toHaveBeenCalled();
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      usersService.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.changeUserPassword(mockChangeInput),
      ).rejects.toThrow(UnauthorizedException);

      // With invalid credentials, the password should not be updated, nor should tokens be revoked
      expect(usersService.updatePassword).not.toHaveBeenCalled();
      expect(prismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('resetUserPassword', () => {
    const mockResetInput = {
      userId: mockActiveUser.id,
      newPassword: 'adminResetPassword789',
    };

    beforeEach(() => {
      usersService.findUserAuthById.mockResolvedValue(mockActiveUser);
      usersService.updatePassword.mockResolvedValue(undefined);
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });
      auditService.log.mockResolvedValue(undefined);
    });

    it('should reset password, revoke all tokens, and log audit on success', async () => {
      await authService.resetUserPassword(mockResetInput);

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockResetInput.userId,
        mockResetInput.newPassword,
      );

      // Unlike changeUserPassword, it does not verify the current password
      expect(usersService.verifyPassword).not.toHaveBeenCalled();

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockResetInput.userId, revoked: false },
        data: { revoked: true },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_RESET_COMPLETED,
          targetUserId: mockResetInput.userId,
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      usersService.findUserAuthById.mockResolvedValue(null);

      await expect(
        authService.resetUserPassword(mockResetInput),
      ).rejects.toThrow(NotFoundException);

      expect(usersService.updatePassword).not.toHaveBeenCalled();
      expect(prismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
