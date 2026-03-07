import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from 'src/audit/audit.service';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VectorDbService } from 'src/vector-db/vector-db.service';
import { MatchingService } from './matching.service';
import { MatchingResult } from './schemas/requirement-root-document.schema';

type MockFn<T extends (...args: never[]) => unknown> = jest.Mock<
  ReturnType<T>,
  Parameters<T>
>;

type AuditServiceMock = {
  log: MockFn<AuditService['log']>;
};

type EmbeddingsServiceMock = {
  getEmbeddings: MockFn<EmbeddingsService['getEmbeddings']>;
};

type VectorDbServiceMock = {
  search: MockFn<VectorDbService['search']>;
};

type PrismaRequirementMock = {
  update: jest.Mock;
};

type PrismaServiceMock = {
  requirement: PrismaRequirementMock;
};

type MatchingModelMock = {
  create: jest.Mock;
  find: jest.Mock;
};

const createAuditServiceMock = (): AuditServiceMock => ({
  log: jest.fn() as MockFn<AuditService['log']>,
});

const createEmbeddingsServiceMock = (): EmbeddingsServiceMock => ({
  getEmbeddings: jest.fn() as MockFn<EmbeddingsService['getEmbeddings']>,
});

const createVectorDbServiceMock = (): VectorDbServiceMock => ({
  search: jest.fn() as MockFn<VectorDbService['search']>,
});

const createPrismaServiceMock = (): PrismaServiceMock => ({
  requirement: {
    update: jest.fn(),
  },
});

const createMatchingModelMock = (): MatchingModelMock => ({
  create: jest.fn(),
  find: jest.fn(),
});

describe('MatchingService', () => {
  let service: MatchingService;

  let auditService: AuditServiceMock;
  let embeddingsService: EmbeddingsServiceMock;
  let vectorDbService: VectorDbServiceMock;
  let prismaService: PrismaServiceMock;
  let matchingModel: MatchingModelMock;

  beforeEach(async () => {
    auditService = createAuditServiceMock();
    embeddingsService = createEmbeddingsServiceMock();
    vectorDbService = createVectorDbServiceMock();
    prismaService = createPrismaServiceMock();
    matchingModel = createMatchingModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: AuditService, useValue: auditService },
        { provide: EmbeddingsService, useValue: embeddingsService },
        { provide: VectorDbService, useValue: vectorDbService },
        { provide: PrismaService, useValue: prismaService },
        {
          provide: getModelToken(MatchingResult.name),
          useValue: matchingModel,
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('matchesResult', () => {
    it('should return matching history from mongo', async () => {
      const mockHistory = [
        {
          _id: 'mongo-id',
          requirementId: 'req-1',
          items: [],
          createdAt: new Date(),
        },
      ];

      const exec = jest.fn().mockResolvedValue(mockHistory);
      const lean = jest.fn().mockReturnValue({ exec });
      const find = jest.fn().mockReturnValue({ lean });

      matchingModel.find = find;

      const result = await service.matchesResult(['req-1']);

      expect(find).toHaveBeenCalledWith(
        { requirementId: { $in: ['req-1'] } },
        {
          _id: 1,
          requirementId: 1,
          items: 1,
          createdAt: 1,
        },
      );

      expect(result).toEqual(mockHistory);
    });

    it('should throw InternalServerErrorException if mongo fails', async () => {
      const exec = jest.fn().mockRejectedValue(new Error('mongo error'));
      const lean = jest.fn().mockReturnValue({ exec });
      const find = jest.fn().mockReturnValue({ lean });

      matchingModel.find = find;

      await expect(service.matchesResult(['req-1'])).rejects.toThrow(
        'Internal server error.',
      );
    });
  });
});
