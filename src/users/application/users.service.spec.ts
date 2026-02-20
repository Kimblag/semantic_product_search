import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from 'src/audit/audit.service';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from 'src/audit/enums/audit-action.enum';

/* Mock factories */
const createPrismaServiceMock = () => ({
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  role: {
    count: jest.fn(),
  },
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
    hashSaltRoundsRefresh: 1,
    hashSaltRounds: 1,
    lockTime: 15,
    maxFailedAttempts: 5,
  },
};

const makePrismaError = (code: string) => {
  const error = new Prisma.PrismaClientKnownRequestError('error', {
    code,
    clientVersion: '0.0.0',
  });
  return error;
};

/* Shared test data */
const USER_ID = 'user-uuid-123';
const ROLE_ID_1 = 'role-uuid-1';
const ROLE_ID_2 = 'role-uuid-2';

const mockUserWithRoles = {
  id: USER_ID,
  email: 'john.doe@example.com',
  name: 'John Doe',
  active: true,
  createdAt: new Date('2024-01-01'),
  passwordHash: 'hashed-password',
  roles: [{ rol: { id: ROLE_ID_1, name: 'ADMIN' } }],
};

const mockUserSelected = {
  id: USER_ID,
  email: 'john.doe@example.com',
  name: 'John Doe',
  active: true,
  createdAt: new Date('2024-01-01'),
};

describe('UsersService Tests', () => {
  let service: UsersService;
  let prismaService: ReturnType<typeof createPrismaServiceMock>;
  let auditService: ReturnType<typeof createAuditServiceMock>;

  beforeEach(async () => {
    // create mock instances
    prismaService = createPrismaServiceMock();
    auditService = createAuditServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuditService, useValue: auditService },
        { provide: appConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // clean all the mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const input = {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: 'plainPassword123',
      roles: [ROLE_ID_1],
    };

    beforeEach(() => {
      prismaService.role.count.mockResolvedValue(input.roles.length);
      prismaService.user.create.mockResolvedValue(mockUserSelected);
    });

    it('should create user successfully', async () => {
      const result = await service.createUser(input);

      expect(result).toMatchObject({
        id: mockUserSelected.id,
        email: mockUserSelected.email,
        name: mockUserSelected.name,
      });
    });

    it('should throw InternalServerErrorException if prisma role count fails', async () => {
      prismaService.role.count.mockRejectedValue(new Error('db error'));

      await expect(service.createUser(input)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if roles are invalid', async () => {
      prismaService.role.count.mockResolvedValue(0);

      await expect(service.createUser(input)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists (P2002)', async () => {
      prismaService.user.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.createUser(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if role reference is invalid (P2003)', async () => {
      prismaService.user.create.mockRejectedValue(makePrismaError('P2003'));

      await expect(service.createUser(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if role not found during create (P2025)', async () => {
      prismaService.user.create.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.createUser(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if unknown prisma error during create', async () => {
      prismaService.user.create.mockRejectedValue(new Error('unknown'));

      await expect(service.createUser(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllUsers', () => {
    const input = {};

    it('should return all users', async () => {
      const mockUsers = [
        {
          ...mockUserSelected,
          roles: [{ rol: { id: ROLE_ID_1, name: 'ADMIN' } }],
        },
      ];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAllUsers(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ email: mockUserSelected.email });
    });

    it('should throw InternalServerErrorException if prisma findMany fails', async () => {
      prismaService.user.findMany.mockRejectedValue(new Error('db error'));

      await expect(service.findAllUsers(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findUserAuthByEmail', () => {
    const EMAIL = 'john.doe@example.com';

    it('should return user by email', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserWithRoles);

      const result = await service.findUserAuthByEmail(EMAIL);

      expect(result).toMatchObject({ email: EMAIL });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: EMAIL } }),
      );
    });

    it('should return null if user by email not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserAuthByEmail(EMAIL);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException if prisma findUnique fails by email', async () => {
      prismaService.user.findUnique.mockRejectedValue(new Error('db error'));

      await expect(service.findUserAuthByEmail(EMAIL)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return user by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserWithRoles);

      const result = await service.findUserById(USER_ID);

      expect(result).toMatchObject({ id: USER_ID });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: USER_ID } }),
      );
    });

    it('should return null if user by id not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserById(USER_ID);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException if prisma findUnique fails by id', async () => {
      prismaService.user.findUnique.mockRejectedValue(new Error('db error'));

      await expect(service.findUserById(USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateUserName', () => {
    const input = {
      userId: USER_ID,
      newName: 'Jane Doe',
      changedBy: 'admin-uuid',
    };

    it('should update user name successfully', async () => {
      prismaService.user.update.mockResolvedValue({
        ...mockUserSelected,
        name: input.newName,
      });

      await expect(service.updateUserName(input)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if user not found on update name (P2025)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.updateUserName(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if conflict on update name (P2002)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.updateUserName(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if unknown prisma error on update name', async () => {
      prismaService.user.update.mockRejectedValue(new Error('unknown'));

      await expect(service.updateUserName(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateUserEmail', () => {
    const input = { userId: USER_ID, newEmail: 'new@example.com' };

    beforeEach(() => {
      auditService.log.mockResolvedValue(undefined);
    });

    it('should update user email successfully', async () => {
      prismaService.user.update.mockResolvedValue({
        ...mockUserSelected,
        email: input.newEmail,
      });

      await service.updateUserEmail(input);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.EMAIL_UPDATED }),
      );
    });

    it('should throw NotFoundException if user not found on update email (P2025)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.updateUserEmail(input)).rejects.toThrow(
        NotFoundException,
      );
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists (P2002)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.updateUserEmail(input)).rejects.toThrow(
        ConflictException,
      );
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if unknown prisma error on update email', async () => {
      prismaService.user.update.mockRejectedValue(new Error('unknown'));

      await expect(service.updateUserEmail(input)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  describe('updateUserRoles', () => {
    const input = {
      userId: USER_ID,
      roles: [ROLE_ID_1, ROLE_ID_2],
      changedBy: 'admin-uuid',
    };

    beforeEach(() => {
      prismaService.role.count.mockResolvedValue(input.roles.length);
      prismaService.user.update.mockResolvedValue(mockUserSelected);
      auditService.log.mockResolvedValue(undefined);
    });

    it('should update user roles successfully', async () => {
      await service.updateUserRoles(input);

      expect(prismaService.user.update).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ROLES_UPDATED }),
      );
    });

    it('should throw BadRequestException if roles are invalid', async () => {
      prismaService.role.count.mockResolvedValue(0);

      await expect(service.updateUserRoles(input)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found on update roles (P2025)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.updateUserRoles(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if prisma conflict on update roles (P2003)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2003'));

      await expect(service.updateUserRoles(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if unknown prisma error on update roles', async () => {
      prismaService.user.update.mockRejectedValue(new Error('unknown'));

      await expect(service.updateUserRoles(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deactivateUser', () => {
    const input = { userId: USER_ID, deactivatedBy: 'admin-uuid' };

    beforeEach(() => {
      prismaService.user.update.mockResolvedValue({
        ...mockUserSelected,
        active: false,
      });
      auditService.log.mockResolvedValue(undefined);
    });

    it('should deactivate user successfully', async () => {
      await service.deactivateUser(input);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { active: false } }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.USER_DEACTIVATED }),
      );
    });

    it('should throw NotFoundException if user not found on deactivate (P2025)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.deactivateUser(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if prisma conflict on deactivate (P2003)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2003'));

      await expect(service.deactivateUser(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if unknown prisma error on deactivate', async () => {
      prismaService.user.update.mockRejectedValue(new Error('unknown'));

      await expect(service.deactivateUser(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('reactivateUser', () => {
    const input = { userId: USER_ID, reactivatedBy: 'admin-uuid' };

    beforeEach(() => {
      prismaService.user.update.mockResolvedValue({
        ...mockUserSelected,
        active: true,
      });
      auditService.log.mockResolvedValue(undefined);
    });

    it('should reactivate user successfully', async () => {
      await service.reactivateUser(input);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { active: true } }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.USER_REACTIVATED }),
      );
    });

    it('should throw NotFoundException if user not found on reactivate (P2025)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.reactivateUser(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if prisma conflict on reactivate (P2003)', async () => {
      prismaService.user.update.mockRejectedValue(makePrismaError('P2003'));

      await expect(service.reactivateUser(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if unknown prisma error on reactivate', async () => {
      prismaService.user.update.mockRejectedValue(new Error('unknown'));

      await expect(service.reactivateUser(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const result = await service.hashPassword('plainPassword123');

      expect(typeof result).toBe('string');
      expect(result).not.toBe('plainPassword123');
      const isValid = await bcrypt.compare('plainPassword123', result);
      expect(isValid).toBe(true);
    });

    it('should throw InternalServerErrorException if bcrypt hash fails', async () => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockRejectedValueOnce(new Error('bcrypt error') as never);

      await expect(service.hashPassword('plainPassword123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verifyPassword', () => {
    it('should return true if password matches', async () => {
      const hash = await bcrypt.hash('correctPassword', 1);

      const result = await service.verifyPassword(hash, 'correctPassword');

      expect(result).toBe(true);
    });

    it('should return false if password does not match', async () => {
      const hash = await bcrypt.hash('correctPassword', 1);

      const result = await service.verifyPassword(hash, 'wrongPassword');

      expect(result).toBe(false);
    });

    it('should throw InternalServerErrorException if bcrypt compare fails', async () => {
      jest
        .spyOn(bcrypt, 'compare')
        .mockRejectedValueOnce(new Error('bcrypt error') as never);

      await expect(service.verifyPassword('hash', 'plain')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      prismaService.user.update.mockResolvedValue(mockUserSelected);

      await expect(
        service.updatePassword(USER_ID, 'newPassword123'),
      ).resolves.not.toThrow();

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: USER_ID } }),
      );
    });

    it('should throw InternalServerErrorException if prisma error on update password', async () => {
      prismaService.user.update.mockRejectedValue(new Error('db error'));

      await expect(
        service.updatePassword(USER_ID, 'newPassword123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
