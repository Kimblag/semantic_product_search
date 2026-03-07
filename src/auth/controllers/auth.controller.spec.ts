import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Request, Response } from 'express';
import { AuthService } from '../application/auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

type AuthServiceMock = {
  signIn: jest.MockedFunction<AuthService['signIn']>;
  refreshToken: jest.MockedFunction<AuthService['refreshToken']>;
  revokeTokenByToken: jest.MockedFunction<AuthService['revokeTokenByToken']>;
  changeUserPassword: jest.MockedFunction<AuthService['changeUserPassword']>;
  resetUserPassword: jest.MockedFunction<AuthService['resetUserPassword']>;
  getRefreshExpirySeconds: jest.MockedFunction<
    AuthService['getRefreshExpirySeconds']
  >;
};

const createAuthServiceMock = (): AuthServiceMock => ({
  signIn: jest.fn(),
  refreshToken: jest.fn(),
  revokeTokenByToken: jest.fn(),
  changeUserPassword: jest.fn(),
  resetUserPassword: jest.fn(),
  getRefreshExpirySeconds: jest.fn().mockReturnValue(604800),
});

type RequestMock = Pick<Request, 'ip' | 'headers'>;

const buildRequest = (overrides: Partial<RequestMock> = {}): Request => {
  const base: RequestMock = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Mozilla/5.0' },
  };
  return { ...base, ...overrides } as unknown as Request;
};

type ResponseMock = {
  cookie: jest.Mock;
  json: jest.Mock;
};

const buildResponse = (): Response => {
  const res: ResponseMock = {
    cookie: jest.fn(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const ACCESS_TOKEN = 'mock-access-token';
const REFRESH_TOKEN = 'mock-refresh-token';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthServiceMock;

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
      const resMock = res as unknown as ResponseMock;

      await controller.signIn(
        { email: 'test@example.com', password: 'pass' },
        req,
        res,
      );

      expect(authService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'pass',
        ip: req.ip,
        ua: 'Mozilla/5.0',
      });

      expect(resMock.cookie).toHaveBeenCalledWith(
        'refreshToken',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true }),
      );

      expect(resMock.json).toHaveBeenCalledWith({ accessToken: ACCESS_TOKEN });
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
      const resMock = res as unknown as ResponseMock;

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

      expect(resMock.json).toHaveBeenCalledWith({ accessToken: ACCESS_TOKEN });
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
  });

  describe('changePassword', () => {
    it('should call changeUserPassword with the current user id', async () => {
      authService.changeUserPassword.mockResolvedValue(undefined);

      const user: JwtPayload = {
        sub: 'user-uuid-123',
        roles: ['EXECUTIVE'],
        iat: 0,
      };

      await controller.changePassword(
        { currentPassword: 'oldPass', newPassword: 'newPass' },
        user,
      );

      expect(authService.changeUserPassword).toHaveBeenCalledWith({
        userId: 'user-uuid-123',
        currentPassword: 'oldPass',
        newPassword: 'newPass',
      });
    });
  });

  describe('resetPassword', () => {
    it('should call resetUserPassword with the target user id from params', async () => {
      authService.resetUserPassword.mockResolvedValue(undefined);

      await controller.resetPassword(
        { newPassword: 'adminResetPass' },
        'target-uuid-456',
      );

      expect(authService.resetUserPassword).toHaveBeenCalledWith({
        userId: 'target-uuid-456',
        newPassword: 'adminResetPass',
      });
    });
  });
});
