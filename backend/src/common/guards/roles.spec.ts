import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

// Builds a minimal ExecutionContext mock with a pre-populated request.user
const buildExecutionContext = (userRoles?: string[]): ExecutionContext => {
  const mockRequest = {
    user: userRoles !== undefined ? { roles: userRoles } : { roles: undefined },
  };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes regardless of user roles', () => {
      // getAllAndOverride is called twice: once for IS_PUBLIC_KEY, once for ROLES_KEY
      reflector.getAllAndOverride
        .mockReturnValueOnce(true) // IS_PUBLIC_KEY  public
        .mockReturnValueOnce(null); // ROLES_KEY no roles required
      const ctx = buildExecutionContext();

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when no roles are required on a protected route', () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY  not public
        .mockReturnValueOnce(null); // ROLES_KEY  roles required
      const ctx = buildExecutionContext(['user']);

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when user has one of the required roles', () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['admin', 'manager']);
      const ctx = buildExecutionContext(['admin']);

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return false when user has none of the required roles', () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['admin']);
      const ctx = buildExecutionContext(['user']);

      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('should return false when user has no roles', () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['admin']);
      const ctx = buildExecutionContext(undefined);

      expect(guard.canActivate(ctx)).toBe(false);
    });
  });
});
