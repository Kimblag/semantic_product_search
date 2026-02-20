import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import appConfig from 'src/config/app.config';

const mockConfig = {
  jwt: {
    secret: 'test-secret',
    refreshSecret: 'test-refresh-secret',
    expiresIn: '10m',
    refreshExpiresIn: '7d',
    issuer: 'test-issuer',
  },
  security: {
    hashSaltRounds: 1,
    hashSaltRoundsRefresh: 1,
    lockTime: 60_000,
    maxFailedAttempts: 3,
  },
};

const mockJwtPayload = { sub: 'user-uuid-123', roles: ['admin'], iat: 1000 };

// Builds a minimal ExecutionContext mock, allowing per-test overrides
const buildExecutionContext = (overrides: {
  isPublic?: boolean;
  authorizationHeader?: string;
}): ExecutionContext => {
  const mockRequest = {
    headers: {
      authorization: overrides.authorizationHeader,
    },
    user: undefined as unknown as { sub: string; roles: string[]; iat: number },
  };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
  } as unknown as ExecutionContext;
};

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: Reflector, useValue: reflector },
        { provide: appConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes without checking the token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = buildExecutionContext({ isPublic: true });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should return true and attach payload to request for valid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      const ctx = buildExecutionContext({
        authorizationHeader: 'Bearer valid-token',
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      const request = ctx
        .switchToHttp()
        .getRequest<{ user: { sub: string; roles: string[]; iat: number } }>();
      expect(request.user).toEqual(mockJwtPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: mockConfig.jwt.secret,
      });
    });

    it('should throw UnauthorizedException if authorization header is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const ctx = buildExecutionContext({ authorizationHeader: undefined });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if authorization scheme is not Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const ctx = buildExecutionContext({
        authorizationHeader: 'Basic some-token',
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is invalid or expired', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      const ctx = buildExecutionContext({
        authorizationHeader: 'Bearer expired-token',
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
