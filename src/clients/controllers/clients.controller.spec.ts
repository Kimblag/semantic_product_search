import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientResponseDto } from '../dtos/client-response.dto';
import { ClientsService } from '../application/clients.service';
import { Response } from 'express';

const createClientsServiceMock = () => ({
  createClient: jest.fn(),
  findAllClients: jest.fn(),
  findClientById: jest.fn(),
  updateClient: jest.fn(),
});

const buildResponse = (): Pick<Response, 'setHeader'> => ({
  setHeader: jest.fn(),
});

const CLIENT_ID = 'client-id-123';

const mockClient: ClientResponseDto = {
  id: CLIENT_ID,
  name: 'Client A',
  email: 'client.a@example.com',
  address: '123 Main St',
  telephone: '555-1234',
  active: true,
  createdAt: new Date('2026-01-01'),
};

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ReturnType<typeof createClientsServiceMock>;

  beforeEach(async () => {
    service = createClientsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: service }],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create client and set Location header', async () => {
      service.createClient.mockResolvedValue(mockClient);

      const res = buildResponse();

      const dto = {
        name: mockClient.name,
        email: mockClient.email,
        address: mockClient.address,
        telephone: mockClient.telephone,
      };

      const result = await controller.create(dto, res as unknown as Response);

      expect(service.createClient).toHaveBeenCalledWith({
        name: dto.name,
        email: dto.email,
        address: dto.address,
        telephone: dto.telephone,
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Location',
        `/clients/${CLIENT_ID}`,
      );

      expect(result).toEqual(mockClient);
    });
  });

  describe('findAll', () => {
    it('should return filtered clients', async () => {
      service.findAllClients.mockResolvedValue([mockClient]);

      const filters = {
        name: 'Client A',
        isActive: true,
      };

      const result = await controller.findAll(filters);

      expect(service.findAllClients).toHaveBeenCalledWith({
        name: filters.name,
        active: filters.isActive,
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return client by id', async () => {
      service.findClientById.mockResolvedValue(mockClient);

      const result = await controller.findOne(CLIENT_ID);

      expect(service.findClientById).toHaveBeenCalledWith(CLIENT_ID);
      expect(result).toEqual(mockClient);
    });
  });

  describe('update', () => {
    it('should call updateClient with mapped dto', async () => {
      service.updateClient.mockResolvedValue(undefined);

      const dto = {
        name: 'Updated',
        email: 'updated@example.com',
        address: 'New Address',
        telephone: '555-9999',
        isActive: false,
      };

      await controller.update(CLIENT_ID, dto);

      expect(service.updateClient).toHaveBeenCalledWith({
        id: CLIENT_ID,
        name: dto.name,
        email: dto.email,
        address: dto.address,
        telephone: dto.telephone,
        isActive: dto.isActive,
      });
    });
  });
});
