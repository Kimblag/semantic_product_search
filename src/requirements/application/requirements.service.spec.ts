import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PassThrough } from 'stream';

import { RequirementsService } from './requirements.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CsvService } from 'src/csv/csv.service';
import { AuditService } from 'src/audit/audit.service';
import { MatchingService } from 'src/matching/matching.service';
import { QueueService } from 'src/queue/queue.service';

import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';
import { ProcessRequirementsInput } from '../inputs/process-requirement.input';

describe('RequirementsService', () => {
  let service: RequirementsService;

  let prisma: {
    client: { findUnique: jest.Mock };
    requirement: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    provider: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  let csvService: {
    readCsv: jest.Mock;
    exportCsvStream: jest.Mock;
  };

  let auditService: {
    log: jest.Mock;
  };

  let matchingService: {
    matchRequirementsToCatalog: jest.Mock;
    matchesResult: jest.Mock;
  };

  let queueService: {
    add: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      client: { findUnique: jest.fn() },
      requirement: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      provider: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    csvService = {
      readCsv: jest.fn(),
      exportCsvStream: jest.fn(),
    };

    auditService = {
      log: jest.fn(),
    };

    matchingService = {
      matchRequirementsToCatalog: jest.fn(),
      matchesResult: jest.fn(),
    };

    queueService = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CsvService, useValue: csvService },
        { provide: AuditService, useValue: auditService },
        { provide: MatchingService, useValue: matchingService },
        { provide: QueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);

    prisma.$transaction.mockImplementation(
      async (queries: Promise<unknown>[]) => Promise.all(queries),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processRequirements', () => {
    const input: ProcessRequirementsInput = {
      clientId: 'client-1',
      filePath: '/tmp/file.csv',
      uploaderUserId: 'user-1',
    };

    it('should stop when client does not exist', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await service.processRequirements(input);

      expect(auditService.log).toHaveBeenCalled();
      expect(prisma.requirement.create).not.toHaveBeenCalled();
    });

    it('should stop when csv has no rows', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });

      csvService.readCsv.mockResolvedValue({
        results: [],
        headers: [],
      });

      await service.processRequirements(input);

      expect(auditService.log).toHaveBeenCalled();
      expect(prisma.requirement.create).not.toHaveBeenCalled();
    });

    it('should create requirement and queue matching job when valid', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });

      csvService.readCsv.mockResolvedValue({
        results: [{ productName: 'Laptop' }],
        headers: [
          'productName',
          'description',
          'category',
          'brand',
          'color',
          'size',
          'material',
          'tags',
          'comments',
        ],
      });

      prisma.requirement.create.mockResolvedValue({
        id: 'req-1',
      });

      queueService.add.mockImplementation((job: () => Promise<void>) => job());

      await service.processRequirements(input);

      expect(prisma.requirement.create).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(queueService.add).toHaveBeenCalled();
    });
  });

  describe('getRequirementsByUser', () => {
    it('should return paginated response', async () => {
      prisma.requirement.count.mockResolvedValue(1);

      prisma.requirement.findMany.mockResolvedValue([
        {
          id: 'req-1',
          clientId: 'client-1',
          client: { name: 'Client' },
          status: RequirementStatus.PROCESSED,
          createdAt: new Date(),
          userId: 'user-1',
          user: { name: 'User', email: 'user@test.com' },
        },
      ]);

      const result = await service.getRequirementsByUser('user-1', {
        page: 1,
        limit: 10,
      });

      expect(result.meta.total).toBe(1);
      expect(result.data.length).toBe(1);
    });

    it('should throw when database fails', async () => {
      prisma.$transaction.mockRejectedValue(new Error());

      await expect(
        service.getRequirementsByUser('user-1', {
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getAllRequirementsAdmin', () => {
    it('should return paginated response', async () => {
      prisma.requirement.count.mockResolvedValue(1);

      prisma.requirement.findMany.mockResolvedValue([
        {
          id: 'req-1',
          clientId: 'client-1',
          client: { name: 'Client' },
          status: RequirementStatus.PROCESSED,
          createdAt: new Date(),
          userId: 'user-1',
          user: { name: 'User', email: 'user@test.com' },
        },
      ]);

      const result = await service.getAllRequirementsAdmin({
        page: 1,
        limit: 10,
      });

      expect(result.meta.total).toBe(1);
      expect(result.data.length).toBe(1);
    });
  });

  describe('getRequirementByUser', () => {
    it('should return requirement with matches', async () => {
      prisma.requirement.count.mockResolvedValue(1);

      prisma.requirement.findMany.mockResolvedValue([
        {
          id: 'req-1',
          clientId: 'client-1',
          client: { name: 'Client' },
          status: RequirementStatus.PROCESSED,
          createdAt: new Date(),
          userId: 'user-1',
          user: { name: 'User', email: 'user@test.com' },
        },
      ]);

      matchingService.matchesResult.mockResolvedValue([]);

      const result = await service.getRequirementByUser('user-1', 'req-1');

      expect(result?.requirementId).toBe('req-1');
    });
  });

  describe('exportRequirementsCsv', () => {
    it('should return csv stream and headers', async () => {
      const fakeRequirement = {
        requirementId: 'req-1',
        clientId: 'client-1',
        client: 'Client',
        userId: 'user-1',
        userName: 'User',
        userEmail: 'user@test.com',
        status: RequirementStatus.PROCESSED,
        createdAt: new Date(),
        results: [],
      };

      jest
        .spyOn(
          service as unknown as {
            getRequirementAdmin: (
              id: string,
            ) => Promise<typeof fakeRequirement | null>;
          },
          'getRequirementAdmin',
        )
        .mockResolvedValue(fakeRequirement);

      const stream = new PassThrough();
      csvService.exportCsvStream.mockReturnValue(stream);

      const result = await service.exportRequirementsCsv('req-1');

      expect(result.stream).toBe(stream);
      expect(result.headers.length).toBeGreaterThan(0);
    });

    it('should throw when requirement not found', async () => {
      jest
        .spyOn(
          service as unknown as {
            getRequirementAdmin: (id: string) => Promise<null>;
          },
          'getRequirementAdmin',
        )
        .mockResolvedValue(null);

      await expect(service.exportRequirementsCsv('req-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
