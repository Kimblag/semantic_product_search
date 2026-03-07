import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProvidersService } from '../application/providers.service';
import { ProvidersCatalogService } from '../application/providers-catalog.service';
import { UploadsService } from 'src/storage/uploads/uploads.service';
import { Response } from 'express';
import { UpdateProviderDto } from '../dtos/update-provider.dto';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

const createProvidersServiceMock = () => ({
  createProvider: jest.fn(),
  findAllProviders: jest.fn(),
  findProviderById: jest.fn(),
  updateProvider: jest.fn(),
});

const createProvidersCatalogServiceMock = () => ({
  processCatalog: jest.fn(),
});

const createUploadsServiceMock = () => ({
  saveBuffer: jest.fn(),
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
  let providersCatalogService: ReturnType<
    typeof createProvidersCatalogServiceMock
  >;
  let uploadsService: ReturnType<typeof createUploadsServiceMock>;

  beforeEach(async () => {
    providersService = createProvidersServiceMock();
    providersCatalogService = createProvidersCatalogServiceMock();
    uploadsService = createUploadsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        { provide: ProvidersService, useValue: providersService },
        { provide: ProvidersCatalogService, useValue: providersCatalogService },
        { provide: UploadsService, useValue: uploadsService },
      ],
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

    it('should create provider, set Location header, and return provider', async () => {
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

    it('should propagate service exception', async () => {
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
    it('should return providers with filters', async () => {
      providersService.findAllProviders.mockResolvedValue({
        data: [MOCK_PROVIDER],
        meta: { total: 1, page: 1, limit: 10 },
      });

      const filters = {
        code: 'PRV001',
        name: 'Provider Name',
        email: 'provider@test.com',
        isActive: true,
        page: 1,
        limit: 10,
      };

      const result = await controller.findAll(filters);

      expect(providersService.findAllProviders).toHaveBeenCalledWith({
        code: filters.code,
        name: filters.name,
        email: filters.email,
        isActive: filters.isActive,
        page: filters.page,
        limit: filters.limit,
      });

      expect(result.data).toEqual([MOCK_PROVIDER]);
    });

    it('should forward undefined filters', async () => {
      providersService.findAllProviders.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      });

      const result = await controller.findAll({});

      expect(providersService.findAllProviders).toHaveBeenCalledWith({
        code: undefined,
        name: undefined,
        email: undefined,
        isActive: undefined,
        page: undefined,
        limit: undefined,
      });

      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return provider by id', async () => {
      providersService.findProviderById.mockResolvedValue(MOCK_PROVIDER);

      const result = await controller.findOne(PROVIDER_ID);

      expect(providersService.findProviderById).toHaveBeenCalledWith(
        PROVIDER_ID,
      );

      expect(result).toEqual(MOCK_PROVIDER);
    });

    it('should return null when provider not found', async () => {
      providersService.findProviderById.mockResolvedValue(null);

      const result = await controller.findOne(PROVIDER_ID);

      expect(result).toBeNull();
    });

    it('should propagate service exception', async () => {
      providersService.findProviderById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.findOne(PROVIDER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update provider with all fields', async () => {
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

    it('should support partial update', async () => {
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

    it('should propagate service exception', async () => {
      providersService.updateProvider.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.update(PROVIDER_ID, { name: 'Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadCatalog', () => {
    const FILE_PATH = '/uploads/providers/file.csv';

    const file = {
      originalname: 'catalog.csv',
      buffer: Buffer.from('csv'),
      size: 10,
      mimetype: 'text/csv',
    } as Express.Multer.File;

    const user: JwtPayload = { sub: 'user-uuid-1', roles: ['admin'], iat: 0 };

    it('should save file and process catalog', () => {
      uploadsService.saveBuffer.mockReturnValue(FILE_PATH);

      controller.uploadCatalog(file, PROVIDER_ID, user);

      expect(uploadsService.saveBuffer).toHaveBeenCalledWith(
        expect.any(String),
        file.originalname,
        file.buffer,
        PROVIDER_ID,
      );

      expect(providersCatalogService.processCatalog).toHaveBeenCalledWith({
        providerId: PROVIDER_ID,
        filePath: FILE_PATH,
        uploaderUserId: user.sub,
      });
    });
  });
});
