import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Request, Response } from 'express';
import { AuthService } from '../application/auth.service';
import { UnauthorizedException } from '@nestjs/common';

const createAuthServiceMock = () => ({
  signIn: jest.fn(),
  refreshToken: jest.fn(),
  revokeTokenByToken: jest.fn(),
  changeUserPassword: jest.fn(),
  resetUserPassword: jest.fn(),
  getRefreshExpirySeconds: jest.fn().mockReturnValue(604800),
});

const buildRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Mozilla/5.0' },
    user: undefined,
    ...overrides,
  }) as unknown as Request;

const buildResponse = (): Response => {
  const res = {
    cookie: jest.fn(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const ACCESS_TOKEN = 'mock-access-token';
const REFRESH_TOKEN = 'mock-refresh-token';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof createAuthServiceMock>;

  beforeEach(async () => {
    authService = createAuthServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should set refresh token cookie and return access token', async () => {
      authService.signIn.mockResolvedValue({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      });
      const req = buildRequest();
      const res = buildResponse();
      const resMock = res as unknown as { cookie: jest.Mock; json: jest.Mock };

      await controller.signIn(
        { email: 'test@example.com', password: 'pass' },
        req,
        res,
      );

      expect(resMock.cookie).toHaveBeenCalledWith(
        'refreshToken',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(resMock.json).toHaveBeenCalledWith({ accessToken: ACCESS_TOKEN });
    });

    it('should propagate exceptions thrown by authService.signIn', async () => {
      authService.signIn.mockRejectedValue(new UnauthorizedException());
      const req = buildRequest();
      const res = buildResponse();

      await expect(
        controller.signIn(
          { email: 'test@example.com', password: 'wrong' },
          req,
          res,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should set new refresh token cookie and return new access token', async () => {
      authService.refreshToken.mockResolvedValue({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      });
      const req = buildRequest();
      const res = buildResponse();
      const resMock = res as unknown as { cookie: jest.Mock; json: jest.Mock };

      await controller.refresh({ refreshToken: 'old-token' }, req, res);

      expect(authService.refreshToken).toHaveBeenCalledWith({
        oldToken: 'old-token',
        ip: req.ip,
        ua: 'Mozilla/5.0',
      });
      expect(resMock.cookie).toHaveBeenCalledWith(
        'refreshToken',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.json).toHaveBeenCalledWith({ accessToken: ACCESS_TOKEN });
    });

    it('should propagate exceptions thrown by authService.refreshToken', async () => {
      authService.refreshToken.mockRejectedValue(new UnauthorizedException());
      const req = buildRequest();
      const res = buildResponse();

      await expect(
        controller.refresh({ refreshToken: 'invalid' }, req, res),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke the provided refresh token', async () => {
      authService.revokeTokenByToken.mockResolvedValue(undefined);

      await controller.logout({ refreshToken: 'token-to-revoke' });

      expect(authService.revokeTokenByToken).toHaveBeenCalledWith(
        'token-to-revoke',
      );
    });

    it('should propagate exceptions thrown by authService.revokeTokenByToken', async () => {
      authService.revokeTokenByToken.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(
        controller.logout({ refreshToken: 'invalid' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const dto = { currentPassword: 'oldPass', newPassword: 'newPass' };

    it('should call changeUserPassword with the current user id', async () => {
      authService.changeUserPassword.mockResolvedValue(undefined);
      const req = buildRequest({
        user: { sub: 'user-uuid-123', roles: ['EXECUTIVE'], iat: 0 },
      });

      await controller.changePassword(dto, req);

      expect(authService.changeUserPassword).toHaveBeenCalledWith({
        userId: 'user-uuid-123',
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
      });
    });

    it('should throw UnauthorizedException if request has no user', async () => {
      const req = buildRequest({ user: undefined });

      await expect(controller.changePassword(dto, req)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.changeUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = { newPassword: 'adminResetPass' };
    const TARGET_USER_ID = 'target-uuid-456';

    it('should call resetUserPassword with the target user id from params', async () => {
      authService.resetUserPassword.mockResolvedValue(undefined);

      await controller.resetPassword(dto, TARGET_USER_ID);

      expect(authService.resetUserPassword).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        newPassword: dto.newPassword,
      });
    });

    it('should propagate exceptions thrown by authService.resetUserPassword', async () => {
      authService.resetUserPassword.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(
        controller.resetPassword(dto, TARGET_USER_ID),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
