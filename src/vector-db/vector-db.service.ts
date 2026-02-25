import { Inject, Injectable } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { ProviderVectorsInput } from './inputs/provider-vectors.input';
import { SemanticSearchInput } from './inputs/semantic-search.input';
import appConfig from 'src/config/app.config';
import { ConfigType } from '@nestjs/config';
import { VectorDbException } from './exceptions/vector-db.exception';
import { DeleteVectorsByVersionInput } from './inputs/delete-vectors-version.input';

@Injectable()
export class VectorDbService {
  private readonly BATCH_SIZE = 100;

  constructor(
    @Inject('PINECONE_CLIENT') private readonly pc: Pinecone,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  private handlePineconeError(
    error: unknown,
    operation: 'upsert' | 'delete' | 'query',
  ): never {
    let status: number | undefined;
    let message = `Unknown error during Pinecone ${operation}`;
    let retryable = false;

    if (error instanceof Error) {
      message = error.message;

      // sometimes Pinecone errors have a status property, sometimes it's nested in response
      // its SDK actually uses its own classes like PineconeBadRequestError, etc.
      // Extract the status if available.
      if ('status' in error && typeof error.status === 'number') {
        status = error.status;
      }
    }

    // Retry classification based on status or network error type (ECONNRESET, ETIMEDOUT, etc.)
    if (status === 429) {
      retryable = true; // Rate limit
    } else if (status && status >= 500) {
      retryable = true; // Server error
    } else if (
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('fetch failed')
    ) {
      retryable = true; // Network error
    }

    throw new VectorDbException(message, retryable, status, operation, error);
  }

  async upsertClientVectors() {}

  async upsertProviderVectors(input: ProviderVectorsInput): Promise<void> {
    const index = this.pc.index({ name: this.config.vectorDb.indexName });
    // upsert new vectors to pinecone in batches of 100
    try {
      for (let i = 0; i < input.newVectors.length; i += this.BATCH_SIZE) {
        const batch = input.newVectors.slice(i, i + this.BATCH_SIZE);
        await index.upsert({ records: batch });
      }
    } catch (error) {
      this.handlePineconeError(error, 'upsert');
    }
  }

  async deleteVectorsByVersion(input: DeleteVectorsByVersionInput) {
    const index = this.pc.index({ name: this.config.vectorDb.indexName });

    // delete pineconeData where metadata.providerId = providerId
    try {
      await index.deleteMany({
        filter: {
          providerId: input.providerId,
          catalogVersionId: input.catalogVersionId,
        },
      });
    } catch (error) {
      this.handlePineconeError(error, 'delete');
    }
  }

  async semanticSearch(input: SemanticSearchInput): Promise<void> {
    // call to pinecone query methods
  }
}
