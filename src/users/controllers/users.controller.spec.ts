import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { UsersService } from '../application/users.service';
import type { Request, Response } from 'express';

const createUsersServiceMock = () => ({
  createUser: jest.fn(),
  findAllUsers: jest.fn(),
  updateUserName: jest.fn(),
  updateUserEmail: jest.fn(),
  updateUserRoles: jest.fn(),
  deactivateUser: jest.fn(),
  reactivateUser: jest.fn(),
});

const buildRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'Mozilla/5.0' },
  user: undefined,
  ...overrides,
});

const buildResponse = (): Pick<Response, 'setHeader'> => ({
  setHeader: jest.fn(),
});

const ADMIN_USER = { sub: 'admin-uuid-123', roles: ['ADMIN'], iat: 1000 };
const TARGET_USER_ID = 'target-uuid-456';
const ROLE_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const mockUserResponse: UserResponseDto = {
  id: TARGET_USER_ID,
  email: 'john@example.com',
  name: 'john doe',
  roles: [{ id: ROLE_UUID, name: 'EXECUTIVE' }],
  active: true,
  createdAt: new Date('2024-01-01'),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: ReturnType<typeof createUsersServiceMock>;

  beforeEach(async () => {
    usersService = createUsersServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = {
      email: 'john@example.com',
      name: 'john doe',
      password: 'Passw0rd!secureX',
      roles: [ROLE_UUID],
    };

    it('should create a user and set Location header', async () => {
      usersService.createUser.mockResolvedValue(mockUserResponse);

      const res = buildResponse();

      const result = await controller.create(dto, res as unknown as Response);

      expect(usersService.createUser).toHaveBeenCalledWith(dto);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Location',
        `/users/${mockUserResponse.id}`,
      );

      expect(result).toEqual(mockUserResponse);
    });

    it('should propagate exceptions', async () => {
      usersService.createUser.mockRejectedValue(new NotFoundException());

      const res = buildResponse();

      await expect(
        controller.create(dto, res as unknown as Response),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMe', () => {
    const dto = { name: 'new name' };

    it('should update current user name', async () => {
      usersService.updateUserName.mockResolvedValue(undefined);
      const req = buildRequest({ user: ADMIN_USER });

      await controller.updateMe(dto, req as Request);

      expect(usersService.updateUserName).toHaveBeenCalledWith({
        userId: ADMIN_USER.sub,
        newName: dto.name,
        changedBy: ADMIN_USER.sub,
      });
    });

    it('should throw UnauthorizedException if no user', async () => {
      const req = buildRequest({ user: undefined });

      await expect(controller.updateMe(dto, req as Request)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(usersService.updateUserName).not.toHaveBeenCalled();
    });
  });

  describe('updateEmail', () => {
    const dto = { newEmail: 'new@example.com' };

    it('should update email', async () => {
      usersService.updateUserEmail.mockResolvedValue(undefined);

      await controller.updateEmail(dto, TARGET_USER_ID);

      expect(usersService.updateUserEmail).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        newEmail: dto.newEmail,
      });
    });
  });

  describe('updateRoles', () => {
    const dto = { roles: [ROLE_UUID] };

    it('should update roles', async () => {
      usersService.updateUserRoles.mockResolvedValue(undefined);
      const req = buildRequest({ user: ADMIN_USER });

      await controller.updateRoles(dto, TARGET_USER_ID, req as Request);

      expect(usersService.updateUserRoles).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        roles: dto.roles,
        changedBy: ADMIN_USER.sub,
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      usersService.deactivateUser.mockResolvedValue(undefined);
      const req = buildRequest({ user: ADMIN_USER });

      await controller.deactivateUser(TARGET_USER_ID, req as Request);

      expect(usersService.deactivateUser).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        deactivatedBy: ADMIN_USER.sub,
      });
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user', async () => {
      usersService.reactivateUser.mockResolvedValue(undefined);
      const req = buildRequest({ user: ADMIN_USER });

      await controller.reactivateUser(TARGET_USER_ID, req as Request);

      expect(usersService.reactivateUser).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        reactivatedBy: ADMIN_USER.sub,
      });
    });
  });
});
