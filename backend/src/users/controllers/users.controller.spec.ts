import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { NotFoundException } from '@nestjs/common';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UsersService } from '../application/users.service';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import type { Response } from 'express';

const createUsersServiceMock = () => ({
  createUser: jest.fn(),
  findUserById: jest.fn(),
  findAllUsers: jest.fn(),
  updateUserName: jest.fn(),
  updateUserEmail: jest.fn(),
  updateUserRoles: jest.fn(),
  deactivateUser: jest.fn(),
  reactivateUser: jest.fn(),
});

const buildResponse = (): Pick<Response, 'setHeader'> => ({
  setHeader: jest.fn(),
});

const ADMIN_USER: JwtPayload = {
  sub: 'admin-uuid-123',
  roles: ['ADMIN'],
  iat: 1000,
};

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

  describe('findOne', () => {
    it('should return a user', async () => {
      usersService.findUserById.mockResolvedValue(mockUserResponse);

      const result = await controller.findOne(TARGET_USER_ID);

      expect(usersService.findUserById).toHaveBeenCalledWith(TARGET_USER_ID);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const paginated = {
        data: [mockUserResponse],
        page: 1,
        limit: 10,
        total: 1,
      };

      usersService.findAllUsers.mockResolvedValue(paginated);

      const query = {
        email: undefined,
        roleId: undefined,
        isActive: true,
        page: 1,
        limit: 10,
      };

      const result = await controller.findAll(query);

      expect(usersService.findAllUsers).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginated);
    });
  });

  describe('updateMe', () => {
    const dto = { name: 'new name' };

    it('should update current user name', async () => {
      usersService.updateUserName.mockResolvedValue(undefined);

      await controller.updateMe(dto, ADMIN_USER);

      expect(usersService.updateUserName).toHaveBeenCalledWith({
        userId: ADMIN_USER.sub,
        newName: dto.name,
        changedBy: ADMIN_USER.sub,
      });
    });

    it('should propagate service errors', async () => {
      usersService.updateUserName.mockRejectedValue(new NotFoundException());

      await expect(controller.updateMe(dto, ADMIN_USER)).rejects.toThrow(
        NotFoundException,
      );
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

      await controller.updateRoles(dto, TARGET_USER_ID, ADMIN_USER);

      expect(usersService.updateUserRoles).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        roles: dto.roles,
        changedBy: ADMIN_USER.sub,
      });
    });
  });

  describe('update', () => {
    const dto = { name: 'updated name' };

    it('should update user name by admin', async () => {
      usersService.updateUserName.mockResolvedValue(undefined);

      await controller.update(dto, TARGET_USER_ID, ADMIN_USER);

      expect(usersService.updateUserName).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        newName: dto.name,
        changedBy: ADMIN_USER.sub,
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      usersService.deactivateUser.mockResolvedValue(undefined);

      await controller.deactivateUser(TARGET_USER_ID, ADMIN_USER);

      expect(usersService.deactivateUser).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        deactivatedBy: ADMIN_USER.sub,
      });
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user', async () => {
      usersService.reactivateUser.mockResolvedValue(undefined);

      await controller.reactivateUser(TARGET_USER_ID, ADMIN_USER);

      expect(usersService.reactivateUser).toHaveBeenCalledWith({
        userId: TARGET_USER_ID,
        reactivatedBy: ADMIN_USER.sub,
      });
    });
  });
});
