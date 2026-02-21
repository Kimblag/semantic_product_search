import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolesService } from './roles.service';

const createPrismaMock = () => ({
  role: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
});

const ROLE_ID = 'role-uuid-123';

const MOCK_ROLE_LIST = {
  id: ROLE_ID,
  name: 'Admin',
  description: 'Administrator role',
};

// Shape returned by Prisma — permissions are nested under a join table
const MOCK_ROLE_PRISMA = {
  id: ROLE_ID,
  name: 'Admin',
  description: 'Administrator role',
  permissions: [
    {
      permission: {
        id: 'permission-uuid-1',
        name: 'Manage Users',
        description: 'Permission to manage users',
      },
    },
  ],
};

// Shape after the service flattens the join table
const MOCK_ROLE_DETAIL = {
  id: ROLE_ID,
  name: 'Admin',
  description: 'Administrator role',
  permissions: [
    {
      id: 'permission-uuid-1',
      name: 'Manage Users',
      description: 'Permission to manage users',
    },
  ],
};

const FIND_UNIQUE_SELECT = {
  id: true,
  name: true,
  description: true,
  permissions: {
    select: {
      permission: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
};

describe('RolesService', () => {
  let service: RolesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllRoles', () => {
    it('should return all roles', async () => {
      prisma.role.findMany.mockResolvedValue([MOCK_ROLE_LIST]);

      const result = await service.findAllRoles();

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, description: true },
      });
      expect(result).toEqual([MOCK_ROLE_LIST]);
    });

    it('should return empty array when no roles exist', async () => {
      prisma.role.findMany.mockResolvedValue([]);

      const result = await service.findAllRoles();

      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db error'));

      await expect(service.findAllRoles()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findRoleById', () => {
    it('should return the role with flattened permissions when found', async () => {
      // Prisma returns nested join-table shape; service flattens it
      prisma.role.findUnique.mockResolvedValue(MOCK_ROLE_PRISMA);

      const result = await service.findRoleById(ROLE_ID);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: ROLE_ID },
        select: FIND_UNIQUE_SELECT,
      });
      expect(result).toEqual(MOCK_ROLE_DETAIL);
    });

    it('should return null when role is not found', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      const result = await service.findRoleById(ROLE_ID);

      expect(result).toBeNull();
    });

    it('should return role with empty permissions array when role has no permissions', async () => {
      prisma.role.findUnique.mockResolvedValue({
        ...MOCK_ROLE_PRISMA,
        permissions: [],
      });

      const result = await service.findRoleById(ROLE_ID);

      expect(result).toEqual({ ...MOCK_ROLE_DETAIL, permissions: [] });
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.role.findUnique.mockRejectedValue(new Error('db error'));

      await expect(service.findRoleById(ROLE_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
