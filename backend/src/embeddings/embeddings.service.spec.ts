import { Test, TestingModule } from '@nestjs/testing';
import OpenAI from 'openai';
import { EmbeddingsService } from './embeddings.service';
import { EmbeddingGenerationException } from './exceptions/embedding-generation.exception';
import { ProviderItem } from 'src/csv/types/provider-item.type';

jest.mock('openai');

type EmbeddingsCreateFn = (...args: unknown[]) => Promise<unknown>;

type OpenAIMock = {
  embeddings: {
    create: jest.MockedFunction<EmbeddingsCreateFn>;
  };
};

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;
  let openaiMock: OpenAIMock;

  beforeEach(async () => {
    openaiMock = {
      embeddings: {
        create: jest.fn(),
      },
    };

    (OpenAI as unknown as jest.Mock).mockImplementation(() => openaiMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingsService],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEmbeddings', () => {
    it('should return embedding vector', async () => {
      const embedding = [0.1, 0.2, 0.3];

      openaiMock.embeddings.create.mockResolvedValue({
        data: [{ embedding }],
      });

      const result = await service.getEmbeddings({ text: 'test text' });

      expect(openaiMock.embeddings.create).toHaveBeenCalled();
      expect(result).toEqual(embedding);
    });

    it('should throw if text is empty', async () => {
      await expect(service.getEmbeddings({ text: '' })).rejects.toBeInstanceOf(
        EmbeddingGenerationException,
      );
    });

    it('should throw if embedding structure is invalid', async () => {
      openaiMock.embeddings.create.mockResolvedValue({
        data: [{}],
      });

      await expect(
        service.getEmbeddings({ text: 'text' }),
      ).rejects.toBeInstanceOf(EmbeddingGenerationException);
    });

    it('should mark retryable when status is 429', async () => {
      openaiMock.embeddings.create.mockRejectedValue({
        status: 429,
        message: 'rate limit',
      });

      await expect(
        service.getEmbeddings({ text: 'text' }),
      ).rejects.toMatchObject({
        retryable: true,
      });
    });

    it('should mark retryable on server error', async () => {
      openaiMock.embeddings.create.mockRejectedValue({
        status: 500,
        message: 'server error',
      });

      await expect(
        service.getEmbeddings({ text: 'text' }),
      ).rejects.toMatchObject({
        retryable: true,
      });
    });

    it('should mark non-retryable on auth error', async () => {
      openaiMock.embeddings.create.mockRejectedValue({
        status: 401,
        message: 'unauthorized',
      });

      await expect(
        service.getEmbeddings({ text: 'text' }),
      ).rejects.toMatchObject({
        retryable: false,
      });
    });
  });

  describe('buildItemEmbeddingText', () => {
    it('should build normalized embedding text', () => {
      const item: ProviderItem = {
        sku: 'SKU123',
        name: 'Product',
        description: 'Description',
        category: 'Category',
        tags: 'tag1|tag2',
        brand: 'Brand',
        color: 'Red',
        size: 'L',
        material: 'Cotton',
        providerCode: 'PROV123',
      };

      const result = service.buildItemEmbeddingText(item);

      expect(result).toContain('Name: Product');
      expect(result).toContain('Description: Description');
      expect(result).toContain('Category: Category');
      expect(result).toContain('Brand: Brand');
    });

    it('should omit optional fields if undefined', () => {
      const item: ProviderItem = {
        sku: 'SKU123',
        name: 'Product',
        description: 'Description',
        category: 'Category',
        providerCode: 'PROV123',
      };

      const result = service.buildItemEmbeddingText(item);

      expect(result).toBe(
        'Name: Product Description: Description Category: Category',
      );
    });
  });
});
