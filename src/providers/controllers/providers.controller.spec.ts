import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProvidersService } from '../application/providers.service';
import { Response } from 'express';
import { UpdateProviderDto } from '../dtos/update-provider.dto';

const createProvidersServiceMock = () => ({
  createProvider: jest.fn(),
  findAllProviders: jest.fn(),
  findProviderById: jest.fn(),
  updateProvider: jest.fn(),
});

const buildResponse = () => ({
  setHeader: jest.fn(),
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

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let providersService: ReturnType<typeof createProvidersServiceMock>;

  beforeEach(async () => {
    providersService = createProvidersServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: providersService }],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = {
      code: 'PRV001',
      name: 'Provider Name',
      email: 'provider@test.com',
      telephone: '123456789',
      address: 'Street 123',
    };

    it('should create provider, set Location header, and return the provider', async () => {
      providersService.createProvider.mockResolvedValue(MOCK_PROVIDER);
      const res = buildResponse();

      const result = await controller.create(dto, res as unknown as Response);

      expect(providersService.createProvider).toHaveBeenCalledWith({
        code: dto.code,
        name: dto.name,
        email: dto.email,
        telephone: dto.telephone,
        address: dto.address,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'Location',
        `/providers/${PROVIDER_ID}`,
      );
      expect(result).toEqual(MOCK_PROVIDER);
    });

    it('should propagate exceptions thrown by providersService.createProvider', async () => {
      providersService.createProvider.mockRejectedValue(
        new ConflictException(),
      );
      const res = buildResponse();

      await expect(
        controller.create(dto, res as unknown as Response),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return providers matching the provided filters', async () => {
      providersService.findAllProviders.mockResolvedValue([MOCK_PROVIDER]);
      const filters = {
        code: 'PRV001',
        name: 'Provider Name',
        email: 'provider@test.com',
        isActive: true,
      };

      const result = await controller.findAll(filters);

      expect(providersService.findAllProviders).toHaveBeenCalledWith({
        code: filters.code,
        name: filters.name,
        email: filters.email,
        isActive: filters.isActive,
      });
      expect(result).toEqual([MOCK_PROVIDER]);
    });

    it('should return all providers when no filters are provided', async () => {
      providersService.findAllProviders.mockResolvedValue([MOCK_PROVIDER]);

      const result = await controller.findAll({});

      expect(providersService.findAllProviders).toHaveBeenCalledWith({
        code: undefined,
        name: undefined,
        email: undefined,
        isActive: undefined,
      });
      expect(result).toEqual([MOCK_PROVIDER]);
    });
  });

  describe('findOne', () => {
    it('should return the provider matching the given id', async () => {
      providersService.findProviderById.mockResolvedValue(MOCK_PROVIDER);

      const result = await controller.findOne(PROVIDER_ID);

      expect(providersService.findProviderById).toHaveBeenCalledWith(
        PROVIDER_ID,
      );
      expect(result).toEqual(MOCK_PROVIDER);
    });

    it('should return null when provider is not found', async () => {
      providersService.findProviderById.mockResolvedValue(null);

      const result = await controller.findOne(PROVIDER_ID);

      expect(result).toBeNull();
    });

    it('should propagate exceptions thrown by providersService.findProviderById', async () => {
      providersService.findProviderById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.findOne(PROVIDER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the provider with all provided fields', async () => {
      providersService.updateProvider.mockResolvedValue(undefined);
      const dto: UpdateProviderDto = {
        code: 'PRV002',
        name: 'Updated Name',
        email: 'updated@test.com',
        telephone: '987654321',
        address: 'New Street 456',
        active: false,
      };

      await controller.update(PROVIDER_ID, dto);

      expect(providersService.updateProvider).toHaveBeenCalledWith({
        id: PROVIDER_ID,
        code: dto.code,
        name: dto.name,
        email: dto.email,
        telephone: dto.telephone,
        address: dto.address,
        active: dto.active,
      });
    });

    it('should forward partial updates passing only the fields present in the dto', async () => {
      providersService.updateProvider.mockResolvedValue(undefined);
      const dto = { name: 'Only Name Updated' };

      await controller.update(PROVIDER_ID, dto);

      expect(providersService.updateProvider).toHaveBeenCalledWith({
        id: PROVIDER_ID,
        code: undefined,
        name: dto.name,
        email: undefined,
        telephone: undefined,
        address: undefined,
        active: undefined,
      });
    });

    it('should propagate exceptions thrown by providersService.updateProvider', async () => {
      providersService.updateProvider.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.update(PROVIDER_ID, { name: 'Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
