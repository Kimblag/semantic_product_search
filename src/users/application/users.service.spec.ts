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

/* MOCK FACTORIES */

const createPrismaServiceMock = () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  role: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

const createAuditServiceMock = () => ({
  log: jest.fn(),
});

const mockConfig = {
  security: {
    hashSaltRounds: 1,
  },
};

const makePrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error', {
    code,
    clientVersion: '0.0.0',
  });

const USER_ID = 'user-uuid-123';
const ROLE_ID_1 = 'role-uuid-1';
const ROLE_ID_2 = 'role-uuid-2';

const mockUserSelected = {
  id: USER_ID,
  email: 'john.doe@example.com',
  name: 'John Doe',
  active: true,
  createdAt: new Date('2024-01-01'),
};

const mockUserWithRoles = {
  ...mockUserSelected,
  passwordHash: 'hash',
  roles: [{ rol: { id: ROLE_ID_1, name: 'ADMIN' } }],
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaServiceMock>;
  let audit: ReturnType<typeof createAuditServiceMock>;

  beforeEach(async () => {
    prisma = createPrismaServiceMock();
    audit = createAuditServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: appConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(UsersService);
  });

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

    it('should create user successfully', async () => {
      prisma.role.count.mockResolvedValue(1);
      prisma.user.create.mockResolvedValue(mockUserSelected);

      const result = await service.createUser(input);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.email).toBe(input.email);
    });

    it('should throw BadRequestException if roles invalid', async () => {
      prisma.role.count.mockResolvedValue(0);

      await expect(service.createUser(input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException on P2002', async () => {
      prisma.role.count.mockResolvedValue(1);
      prisma.user.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.createUser(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      prisma.role.count.mockResolvedValue(1);
      prisma.user.create.mockRejectedValue(new Error());

      await expect(service.createUser(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllUsers', () => {
    const input = {
      page: 1,
      limit: 10,
      email: undefined,
      isActive: true,
      roleId: undefined,
    };

    it('should return paginated users', async () => {
      prisma.$transaction.mockResolvedValue([
        1,
        [
          {
            ...mockUserSelected,
            roles: [{ rol: { id: ROLE_ID_1, name: 'ADMIN' } }],
          },
        ],
      ]);

      const result = await service.findAllUsers(input);

      expect(result.meta.total).toBe(1);
      expect(result.data.length).toBe(1);
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.$transaction.mockRejectedValue(new Error());

      await expect(service.findAllUsers(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findUserAuthByEmail', () => {
    const EMAIL = 'john.doe@example.com';

    it('should return user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithRoles);

      const result = await service.findUserAuthByEmail(EMAIL);

      expect(result?.email).toBe(EMAIL);
    });

    it('should return null if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserAuthByEmail(EMAIL);

      expect(result).toBeNull();
    });
  });

  describe('findUserAuthById', () => {
    it('should return user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithRoles);

      const result = await service.findUserAuthById(USER_ID);

      expect(result?.id).toBe(USER_ID);
    });

    it('should return null if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserAuthById(USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should return user dto', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithRoles);

      const result = await service.findUserById(USER_ID);

      expect(result?.id).toBe(USER_ID);
    });

    it('should return null if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserById(USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('updateUserName', () => {
    const input = {
      userId: USER_ID,
      newName: 'Jane Doe',
      changedBy: 'admin',
    };

    it('should update successfully', async () => {
      prisma.user.update.mockResolvedValue(mockUserSelected);

      await expect(service.updateUserName(input)).resolves.not.toThrow();
    });

    it('should throw NotFoundException', async () => {
      prisma.user.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.updateUserName(input)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserEmail', () => {
    const input = { userId: USER_ID, newEmail: 'new@example.com' };

    beforeEach(() => {
      audit.log.mockResolvedValue(undefined);
    });

    it('should update email and log audit', async () => {
      prisma.user.update.mockResolvedValue(mockUserSelected);

      await service.updateUserEmail(input);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.EMAIL_UPDATED,
        }),
      );
    });

    it('should throw ConflictException on duplicate', async () => {
      prisma.user.update.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.updateUserEmail(input)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateUserRoles', () => {
    const input = {
      userId: USER_ID,
      roles: [ROLE_ID_1, ROLE_ID_2],
      changedBy: 'admin',
    };

    beforeEach(() => {
      audit.log.mockResolvedValue(undefined);
    });

    it('should update roles', async () => {
      prisma.role.count.mockResolvedValue(2);
      prisma.user.update.mockResolvedValue(mockUserSelected);

      await service.updateUserRoles(input);

      expect(prisma.user.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if roles invalid', async () => {
      prisma.role.count.mockResolvedValue(0);

      await expect(service.updateUserRoles(input)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deactivateUser', () => {
    const input = { userId: USER_ID, deactivatedBy: 'admin' };

    beforeEach(() => {
      audit.log.mockResolvedValue(undefined);
    });

    it('should deactivate user', async () => {
      prisma.user.update.mockResolvedValue(mockUserSelected);

      await service.deactivateUser(input);

      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('reactivateUser', () => {
    const input = { userId: USER_ID, reactivatedBy: 'admin' };

    beforeEach(() => {
      audit.log.mockResolvedValue(undefined);
    });

    it('should reactivate user', async () => {
      prisma.user.update.mockResolvedValue(mockUserSelected);

      await service.reactivateUser(input);

      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const hash = await service.hashPassword('password');

      expect(typeof hash).toBe('string');

      const valid = await bcrypt.compare('password', hash);
      expect(valid).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should validate password', async () => {
      const hash = await bcrypt.hash('secret', 1);

      const result = await service.verifyPassword(hash, 'secret');

      expect(result).toBe(true);
    });
  });

  describe('updatePassword', () => {
    it('should update password', async () => {
      prisma.user.update.mockResolvedValue(mockUserSelected);

      await service.updatePassword(USER_ID, 'newPass');

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on error', async () => {
      prisma.user.update.mockRejectedValue(new Error());

      await expect(service.updatePassword(USER_ID, 'newPass')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
