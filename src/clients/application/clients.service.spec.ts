import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

/* Mock factories */
const createPrismaServiceMock = () => ({
  client: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

const makePrismaError = (code: string) => {
  const error = new Prisma.PrismaClientKnownRequestError('error', {
    code,
    clientVersion: '0.0.0',
  });
  return error;
};

// shared data
const CLIENT_ID = 'client-id-123';

const mockClientSelected = {
  id: CLIENT_ID,
  name: 'Client A',
  email: 'client.a@example.com',
  address: '123 Main St',
  telephone: '555-1234',
  active: true,
  createdAt: new Date('2026-01-01'),
};

describe('ClientsService', () => {
  let service: ClientsService;
  let prismaService: ReturnType<typeof createPrismaServiceMock>;

  beforeEach(async () => {
    prismaService = createPrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createClient', () => {
    const input = {
      name: 'Client A',
      email: 'client.a@example.com',
      address: '123 Main St',
      telephone: '555-1234',
    };

    it('should create client successfully', async () => {
      prismaService.client.create.mockResolvedValue(mockClientSelected);

      const result = await service.createClient(input);

      expect(prismaService.client.create).toHaveBeenCalledWith({
        data: input,
      });

      expect(result).toMatchObject({
        id: CLIENT_ID,
        name: input.name,
        email: input.email,
      });
    });

    it('should throw ConflictException on P2002', async () => {
      prismaService.client.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.createClient(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      prismaService.client.create.mockRejectedValue(new Error());

      await expect(service.createClient(input)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllClients', () => {
    it('should return clients with filters', async () => {
      prismaService.client.findMany.mockResolvedValue([mockClientSelected]);

      const result = await service.findAllClients({
        name: 'Client A',
        email: undefined,
        active: true,
      });

      expect(prismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: 'Client A',
            active: true,
          },
        }),
      );

      expect(result).toHaveLength(1);
    });

    it('should throw InternalServerErrorException on error', async () => {
      prismaService.client.findMany.mockRejectedValue(new Error());

      await expect(service.findAllClients({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findClientById', () => {
    it('should return client when found', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClientSelected);

      const result = await service.findClientById(CLIENT_ID);

      expect(prismaService.client.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CLIENT_ID },
        }),
      );
      expect(result?.id).toBe(CLIENT_ID);
    });

    it('should throw InternalServerErrorException on error', async () => {
      prismaService.client.findUnique.mockRejectedValue(new Error());

      await expect(service.findClientById(CLIENT_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateClient', () => {
    it('should update only provided fields', async () => {
      prismaService.client.update.mockResolvedValue(undefined);

      await service.updateClient({
        id: CLIENT_ID,
        name: 'Updated Name',
        isActive: false,
      });

      expect(prismaService.client.update).toHaveBeenCalledWith({
        where: { id: CLIENT_ID },
        data: { name: 'Updated Name', active: false },
      });
    });

    it('should throw NotFoundException on P2025', async () => {
      prismaService.client.update.mockRejectedValue(makePrismaError('P2025'));

      await expect(service.updateClient({ id: CLIENT_ID })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on P2002', async () => {
      prismaService.client.update.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.updateClient({ id: CLIENT_ID })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
