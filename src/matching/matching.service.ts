import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from 'src/audit/audit.service';
import { RequirementItem } from 'src/requirements/types/requirement-item.type';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import {
  MatchingResult,
  MatchingResultDocument,
} from './schemas/requirement-root-document.schema';
import { PrismaService } from 'src/prisma/prisma.service';
import { VectorDbService } from 'src/vector-db/vector-db.service';
import { Requirement } from '@prisma/client';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { RequirementStatus } from './enums/requirement-status.enum';
import { EmbeddingGenerationException } from 'src/embeddings/exceptions/embedding-generation.exception';
import { VectorDbException } from 'src/vector-db/exceptions/vector-db.exception';
import {
  RecordMetadata,
  ScoredPineconeRecord,
} from '@pinecone-database/pinecone';

@Injectable()
export class MatchingService {
  private readonly MAX_RETRIES: number = 3;
  private readonly BASE_DELAY_MS: number = 500;
  private readonly EMBEDDING_BATCH_SIZE: number = 10;
  private readonly SEARCH_BATCH_SIZE: number = 20;
  private readonly TOP_K: number = 10;

  constructor(
    private readonly auditService: AuditService,
    private readonly embeddingService: EmbeddingsService,
    @InjectModel(MatchingResult.name)
    private readonly catalogItemModel: Model<MatchingResultDocument>,
    private readonly prisma: PrismaService,
    private readonly vectorDbService: VectorDbService,
  ) {}

  private async handleRequirementFailure(
    clientId: string,
    requirementId: string,
    filePath: string,
    reason: string,
    uploaderUserId: string,
  ): Promise<void> {
    // register log audit
    await this.auditService.log({
      action: AuditAction.REQUIREMENTS_PROCESSING_FAILED,
      metadata: { clientId, requirementId, filePath, reason, uploaderUserId },
    });

    // set FAILED requirement in Prisma
    await this.prisma.requirement.update({
      where: {
        id: requirementId,
      },
      data: {
        status: RequirementStatus.ERROR,
      },
    });
  }

  private buildEmbeddingText(item: RequirementItem): string {
    // check the fields to avoid undefined values, and build the embedding text with the available fields
    // avoid blank spaces and newlines, to save tokens
    const parts = [`Name: ${item.productName}`];

    // now check the optional fields and add them to the text if they exist
    if (item.description) parts.push(`Description: ${item.description}`);
    if (item.category) parts.push(`Category: ${item.category}`);
    if (item.tags) parts.push(`Tags: ${item.tags.join('|')}`);
    if (item.brand) parts.push(`Brand: ${item.brand}`);
    if (item.color) parts.push(`Color: ${item.color}`);
    if (item.size) parts.push(`Size: ${item.size}`);
    if (item.material) parts.push(`Material: ${item.material}`);
    if (item.comments) parts.push(`Comments: ${item.comments}`);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private async generateEmbeddingWithRetry(text: string): Promise<number[]> {
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        return await this.embeddingService.getEmbeddings({ text });
      } catch (error: unknown) {
        attempt++;

        if (error instanceof EmbeddingGenerationException) {
          if (!error.retryable) {
            throw error;
          }

          if (attempt < this.MAX_RETRIES) {
            const delay = this.BASE_DELAY_MS * 2 ** (attempt - 1);
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }
        }

        throw error;
      }
    }

    throw new Error('Unreachable retry state');
  }

  private async generateVectorsForRequirements(
    requirementId: string,
    requirements: RequirementItem[],
    clientId: string,
    filePath: string,
    uploaderUserId: string,
  ): Promise<{
    success: boolean;
    itemsWithVectors: (RequirementItem & { vector: number[] })[];
  }> {
    const itemsWithVectors: (RequirementItem & { vector: number[] })[] = [];

    try {
      for (let i = 0; i < requirements.length; i += this.EMBEDDING_BATCH_SIZE) {
        const batch = requirements.slice(i, i + this.EMBEDDING_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (item) => {
            const text = this.buildEmbeddingText(item);
            const vector = await this.generateEmbeddingWithRetry(text);

            return {
              ...item,
              vector,
            };
          }),
        );

        itemsWithVectors.push(...batchResults);
      }

      return { success: true, itemsWithVectors };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown embedding error';

      await this.handleRequirementFailure(
        clientId,
        requirementId,
        filePath,
        reason,
        uploaderUserId,
      );

      return { success: false, itemsWithVectors: [] };
    }
  }

  private async searchWithRetry(
    vector: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ) {
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        return await this.vectorDbService.search({
          vector: vector,
          topK: topK,
          filter: filter,
        });
      } catch (error) {
        attempt++;

        if (error instanceof VectorDbException) {
          if (!error.retryable) {
            throw error;
          }

          if (attempt < this.MAX_RETRIES) {
            const delay = this.BASE_DELAY_MS * 2 ** (attempt - 1);
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }
        }

        throw error;
      }
    }

    throw new Error('Unreachable retry state');
  }

  private async searchCatalogMatches(
    requirementId: string,
    itemsWithVectors: (RequirementItem & { vector: number[] })[],
    clientId: string,
    filePath: string,
    uploaderUserId: string,
  ) {
    const allResults: ScoredPineconeRecord<RecordMetadata>[][] = [];

    try {
      for (
        let i = 0;
        i < itemsWithVectors.length;
        i += this.SEARCH_BATCH_SIZE
      ) {
        const batch = itemsWithVectors.slice(i, i + this.SEARCH_BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map((item) =>
            this.searchWithRetry(item.vector, this.TOP_K, undefined),
          ),
        );

        allResults.push(...batchResults);
      }

      return allResults;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown vector search error';

      await this.handleRequirementFailure(
        clientId,
        requirementId,
        filePath,
        reason,
        uploaderUserId,
      );

      return null;
    }
  }

  private buildMatchingDocument(
    requirementId: string,
    uploaderUserId: string,
    itemsWithVectors: (RequirementItem & { vector: number[] })[],
    searchResults: ScoredPineconeRecord<RecordMetadata>[][],
  ) {
    const items = itemsWithVectors.map((reqItem, index) => {
      const pineconeMatches = searchResults[index] ?? [];

      const matches = pineconeMatches.map((record) => {
        const m = record.metadata;
        return {
          catalogItemId: record.id,
          sku: record.id.split('#')[1],
          name: m.name.toString(),
          description:
            typeof m.description === 'string' ? m.description : undefined,
          category: typeof m.category === 'string' ? m.category : undefined,
          tags: Array.isArray(m.tags) ? m.tags : [],
          attributes:
            typeof m.attributes === 'object' && m.attributes !== null
              ? m.attributes
              : {},
          providerId: m.providerId.toString(),
          catalogVersionId: m.catalogVersionId.toString(),
          score: record.score,
        };
      });

      return {
        item: {
          productName: reqItem.productName,
          description: reqItem.description,
          category: reqItem.category,
          brand: reqItem.brand,
          color: reqItem.color,
          size: reqItem.size,
          material: reqItem.material,
          tags: reqItem.tags ?? [],
          comments: reqItem.comments,
        },
        matches,
      };
    });

    return {
      requirementId,
      executedBy: uploaderUserId,
      items,
    };
  }

  async matchRequirementsToCatalog(
    requirement: Requirement,
    requirements: RequirementItem[],
    uploaderUserId: string,
  ) {
    // generate embeddings for the requirement items
    const { success, itemsWithVectors } =
      await this.generateVectorsForRequirements(
        requirement.id,
        requirements,
        requirement.clientId,
        requirement.originalFile,
        uploaderUserId,
      );

    if (!success) {
      return;
    }
    // search for similar items in the vector database
    const searchResults = await this.searchCatalogMatches(
      requirement.id,
      itemsWithVectors,
      requirement.clientId,
      requirement.originalFile,
      uploaderUserId,
    );

    if (!searchResults) return;
    // store the matching result in mongo db
    // update prisma requirement record with the matching result id
    try {
      const document = this.buildMatchingDocument(
        requirement.id,
        uploaderUserId,
        itemsWithVectors,
        searchResults,
      );

      const saved = await this.catalogItemModel.create(document);

      await this.prisma.requirement.update({
        where: { id: requirement.id },
        data: {
          status: RequirementStatus.PROCESSED,
        },
      });

      await this.auditService.log({
        action: AuditAction.REQUIREMENTS_PROCESSING_SUCCEEDED,
        metadata: {
          requirementId: requirement.id,
          matchingResultId: saved._id.toString(),
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Mongo persistence error';

      await this.handleRequirementFailure(
        requirement.clientId,
        requirement.id,
        requirement.originalFile,
        reason,
        uploaderUserId,
      );

      return;
    }
  }
}
