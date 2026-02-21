import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersService } from './providers.service';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const createPrismaMock = () => ({
  provider: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
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

    it('should create provider successfully and return the mapped fields', async () => {
      prisma.provider.create.mockResolvedValue(MOCK_PROVIDER);

      const result = await service.createProvider(input);

      // Verify the service maps each field explicitly, not spreading input directly
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
      prisma.provider.create.mockRejectedValue(new Error('unknown'));

      await expect(service.createProvider(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllProviders', () => {
    it('should return all providers when no filters are provided', async () => {
      prisma.provider.findMany.mockResolvedValue([MOCK_PROVIDER]);

      const result = await service.findAllProviders({});

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: {},
        select: SELECTED_FIELDS,
      });
      expect(result).toEqual([MOCK_PROVIDER]);
    });

    it('should filter by code when provided', async () => {
      prisma.provider.findMany.mockResolvedValue([MOCK_PROVIDER]);

      await service.findAllProviders({ code: 'PRV001' });

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: { code: 'PRV001' },
        select: SELECTED_FIELDS,
      });
    });

    it('should filter by email when provided', async () => {
      prisma.provider.findMany.mockResolvedValue([MOCK_PROVIDER]);

      await service.findAllProviders({ email: 'provider@test.com' });

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: { email: 'provider@test.com' },
        select: SELECTED_FIELDS,
      });
    });

    it('should filter by name when provided', async () => {
      prisma.provider.findMany.mockResolvedValue([MOCK_PROVIDER]);

      await service.findAllProviders({ name: 'Provider Name' });

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: { name: 'Provider Name' },
        select: SELECTED_FIELDS,
      });
    });

    it('should filter by isActive when provided', async () => {
      prisma.provider.findMany.mockResolvedValue([MOCK_PROVIDER]);

      await service.findAllProviders({ isActive: true });

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: SELECTED_FIELDS,
      });
    });

    it('should apply all filters simultaneously when all are provided', async () => {
      prisma.provider.findMany.mockResolvedValue([MOCK_PROVIDER]);

      await service.findAllProviders({
        code: 'PRV001',
        email: 'provider@test.com',
        name: 'Provider Name',
        isActive: false,
      });

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: {
          code: 'PRV001',
          email: 'provider@test.com',
          name: 'Provider Name',
          active: false,
        },
        select: SELECTED_FIELDS,
      });
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.provider.findMany.mockRejectedValue(new Error('db error'));

      await expect(service.findAllProviders({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findProviderById', () => {
    it('should return the provider when found', async () => {
      prisma.provider.findUnique.mockResolvedValue(MOCK_PROVIDER);

      const result = await service.findProviderById(PROVIDER_ID);

      expect(prisma.provider.findUnique).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        select: SELECTED_FIELDS,
      });
      expect(result).toEqual(MOCK_PROVIDER);
    });

    it('should return null when provider is not found', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);

      const result = await service.findProviderById(PROVIDER_ID);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.provider.findUnique.mockRejectedValue(
        new InternalServerErrorException('db error'),
      );

      await expect(service.findProviderById(PROVIDER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateProvider', () => {
    it('should update only the fields that are provided', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({
        id: PROVIDER_ID,
        name: 'Updated Name',
        email: 'updated@test.com',
      });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { name: 'Updated Name', email: 'updated@test.com' },
      });
    });

    it('should include active: false in the update when explicitly set', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({ id: PROVIDER_ID, active: false });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { active: false },
      });
    });

    it('should include active: true in the update when explicitly set', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({ id: PROVIDER_ID, active: true });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { active: true },
      });
    });

    it('should not include undefined optional fields in the update data', async () => {
      prisma.provider.update.mockResolvedValue(undefined);

      await service.updateProvider({ id: PROVIDER_ID, code: 'PRV002' });

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: PROVIDER_ID },
        data: { code: 'PRV002' },
      });
    });

    it('should throw InternalServerErrorException on prisma error', async () => {
      prisma.provider.update.mockRejectedValue(new Error('db error'));

      await expect(
        service.updateProvider({ id: PROVIDER_ID, name: 'Updated Name' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
