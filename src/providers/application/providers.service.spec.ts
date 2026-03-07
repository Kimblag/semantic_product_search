import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProvidersService } from './providers.service';

const createPrismaMock = () => ({
  provider: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makePrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error', {
    code,
    clientVersion: '0.0.0',
  });

const PROVIDER_ID = 'provider-uuid-123';

const MOCK_PROVIDER = {
  id: PROVIDER_ID,
  code: 'PRV001',
  name: 'Provider Name',
  email: 'provider@test.com',
  telephone: '123456789',
  address: 'Street 123',
  active: true,
  createdAt: new Date('2024-01-01'),
};

const SELECTED_FIELDS = {
  id: true,
  code: true,
  name: true,
  email: true,
  telephone: true,
  address: true,
  active: true,
  createdAt: true,
};

describe('ProvidersService', () => {
  let service: ProvidersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProvider', () => {
    const input = {
      code: 'PRV001',
      name: 'Provider Name',
      email: 'provider@test.com',
      telephone: '123456789',
      address: 'Street 123',
    };

    it('should create provider successfully', async () => {
      prisma.provider.create.mockResolvedValue(MOCK_PROVIDER);

      const result = await service.createProvider(input);

      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: {
          code: input.code,
          name: input.name,
          email: input.email,
          telephone: input.telephone,
          address: input.address,
        },
        select: SELECTED_FIELDS,
      });

      expect(result).toEqual(MOCK_PROVIDER);
    });

    it('should throw ConflictException on P2002', async () => {
      prisma.provider.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.createProvider(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException on P2025', async () => {
      prisma.provider.create.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.createProvider(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      prisma.provider.create.mockRejectedValue(new Error());

      await expect(service.createProvider(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllProviders', () => {
    it('should return paginated providers without filters', async () => {
      prisma.$transaction.mockResolvedValue([1, [MOCK_PROVIDER]]);

      const result = await service.findAllProviders({
        page: 1,
        limit: 10,
      });

      expect(prisma.$transaction).toHaveBeenCalled();

      expect(result).toEqual({
        data: [MOCK_PROVIDER],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should apply filters correctly', async () => {
      prisma.$transaction.mockResolvedValue([1, [MOCK_PROVIDER]]);

      await service.findAllProviders({
        code: 'PRV001',
        email: 'provider@test.com',
        name: 'Provider Name',
        isActive: false,
        page: 1,
        limit: 10,
      });

      expect(prisma.provider.count).toHaveBeenCalledWith({
        where: {
          code: 'PRV001',
          email: { contains: 'provider@test.com' },
          name: { contains: 'Provider Name' },
          active: false,
        },
      });

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: {
          code: 'PRV001',
          email: { contains: 'provider@test.com' },
          name: { contains: 'Provider Name' },
          active: false,
        },
        skip: 0,
        take: 10,
        select: SELECTED_FIELDS,
      });
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.$transaction.mockRejectedValue(new Error());

      await expect(
        service.findAllProviders({ page: 1, limit: 10 }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findProviderById', () => {
    it('should return provider when found', async () => {
      prisma.provider.findUnique.mockResolvedValue(MOCK_PROVIDER);

      const result = await service.findProviderById(PROVIDER_ID);

      expect(prisma.provider.findUnique).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        select: SELECTED_FIELDS,
      });

      expect(result).toEqual(MOCK_PROVIDER);
    });

    it('should return null when provider not found', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);

      const result = await service.findProviderById(PROVIDER_ID);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.provider.findUnique.mockRejectedValue(new Error());

      await expect(service.findProviderById(PROVIDER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateProvider', () => {
    it('should update provided fields', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({
        id: PROVIDER_ID,
        name: 'Updated Name',
        email: 'updated@test.com',
      });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: {
          name: 'Updated Name',
          email: 'updated@test.com',
        },
      });
    });

    it('should include active false when explicitly set', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({
        id: PROVIDER_ID,
        active: false,
      });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { active: false },
      });
    });

    it('should include active true when explicitly set', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({
        id: PROVIDER_ID,
        active: true,
      });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { active: true },
      });
    });

    it('should not include undefined fields', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({
        id: PROVIDER_ID,
        code: 'PRV002',
      });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { code: 'PRV002' },
      });
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.provider.update.mockRejectedValue(
        new InternalServerErrorException(),
      );

      await expect(
        service.updateProvider({ id: PROVIDER_ID, name: 'Updated Name' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
