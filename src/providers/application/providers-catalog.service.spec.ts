import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProvidersCatalogService } from './providers-catalog.service';
import { CsvService } from '../../csv/csv.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VectorDbService } from 'src/vector-db/vector-db.service';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { AuditService } from 'src/audit/audit.service';
import { QueueService } from 'src/queue/queue.service';
import { CatalogItem } from '../schemas/provider-item.schema';
import { Job } from 'src/queue/types/queue-job.type';
import { ProcessCatalogInput } from './inputs/process-catalog.input';

describe('ProvidersCatalogService', () => {
  let service: ProvidersCatalogService;

  const csvServiceMock = {
    readCsv: jest.fn(),
  };

  const prismaServiceMock = {
    provider: { findUnique: jest.fn() },
    catalogProviderVersion: {
      update: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const vectorDbServiceMock = {
    upsertProviderVectors: jest.fn(),
    deleteVectorsByVersion: jest.fn(),
  };

  const embeddingsServiceMock = {
    buildItemEmbeddingText: jest.fn(),
    getEmbeddings: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  const queueServiceMock: { add: jest.Mock } = {
    add: jest.fn(),
  };

  const catalogItemModelMock = {
    insertMany: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersCatalogService,
        { provide: CsvService, useValue: csvServiceMock },
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: VectorDbService, useValue: vectorDbServiceMock },
        { provide: EmbeddingsService, useValue: embeddingsServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: QueueService, useValue: queueServiceMock },
        {
          provide: getModelToken(CatalogItem.name),
          useValue: catalogItemModelMock,
        },
      ],
    }).compile();

    service = module.get<ProvidersCatalogService>(ProvidersCatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enqueue catalog processing job', () => {
    const input: ProcessCatalogInput = {
      providerId: 'provider-1',
      filePath: '/tmp/catalog.csv',
      uploaderUserId: 'user-1',
    };

    service.processCatalog(input);

    expect(queueServiceMock.add).toHaveBeenCalledTimes(1);

    const calls = queueServiceMock.add.mock.calls as unknown as [Job<void>][];
    const jobFn = calls[0][0];

    expect(typeof jobFn).toBe('function');
  });

  it('should enqueue job that calls uploadCatalog', async () => {
    const input: ProcessCatalogInput = {
      providerId: 'provider-1',
      filePath: '/tmp/catalog.csv',
      uploaderUserId: 'user-1',
    };

    const uploadSpy = jest
      .spyOn(
        service as unknown as {
          uploadCatalog: (i: ProcessCatalogInput) => Promise<void>;
        },
        'uploadCatalog',
      )
      .mockResolvedValue(undefined);

    service.processCatalog(input);

    const calls = queueServiceMock.add.mock.calls as unknown as [Job<void>][];
    const jobFn = calls[0][0];

    await jobFn();

    expect(uploadSpy).toHaveBeenCalledWith(input);
  });
});
