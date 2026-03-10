import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CatalogProviderVersion } from '@prisma/client';
import { Model } from 'mongoose';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { ProviderItem } from 'src/csv/types/provider-item.type';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { EmbeddingGenerationException } from 'src/embeddings/exceptions/embedding-generation.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { CatalogVersionStatus } from 'src/providers/enums/catalog-version-status.enum';
import { QueueService } from 'src/queue/queue.service';
import { VectorDbException } from 'src/vector-db/exceptions/vector-db.exception';
import { ProductVectorDocument } from 'src/vector-db/interfaces/provider-item-vector-db.interface';
import { VectorDbService } from 'src/vector-db/vector-db.service';
import { CsvService } from '../../csv/csv.service';
import {
  CatalogItem,
  CatalogItemDocument,
} from '../schemas/provider-item.schema';
import { ProcessCatalogInput } from './inputs/process-catalog.input';
import { ValidateCatalogPreconditionsOutput } from './outputs/validate-catalog-preconditions.output';

@Injectable()
export class ProvidersCatalogService {
  private readonly REQUIRED_FIELDS = [
    'providerCode',
    'sku',
    'name',
    'description',
    'category',
  ];

  private readonly TEMPLATE_COLUMNS: string[] = [
    'providerCode',
    'sku',
    'name',
    'description',
    'category',
    'tags',
    'brand',
    'color',
    'size',
    'material',
  ];

  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 500;

  constructor(
    private readonly csvService: CsvService,
    private readonly prisma: PrismaService,
    private readonly vectorDbService: VectorDbService,
    private readonly embeddingsService: EmbeddingsService,
    @InjectModel(CatalogItem.name)
    private readonly catalogItemModel: Model<CatalogItemDocument>,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  private async handleProcessFailure(
    providerId: string,
    versionId: string,
    filePath: string,
    reason: string,
  ): Promise<void> {
    await this.auditService.log({
      action: AuditAction.CATALOG_PROCESSING_FAILED,
      metadata: { providerId, filePath, reason, versionId },
    });

    await this.prisma.catalogProviderVersion.update({
      where: { id: versionId },
      data: {
        status: CatalogVersionStatus.FAILED,
        errorMessage: reason,
      },
    });

    await this.catalogItemModel.deleteMany({
      providerId,
      catalogVersionId: versionId,
      active: false,
    });
  }

  private async validateCatalogPreconditions(
    providerId: string,
    filePath: string,
  ): Promise<ValidateCatalogPreconditionsOutput> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return {
        isValid: false,
        reason: 'Provider target not found in database',
      };
    }

    const { results: items, headers } =
      await this.csvService.readCsv<ProviderItem>(filePath);

    if (!items || items.length === 0) {
      return {
        isValid: false,
        reason: 'The CSV file is empty or has an invalid format',
      };
    }

    const missingColumns = this.TEMPLATE_COLUMNS.filter(
      (col) => !headers.includes(col),
    );
    if (missingColumns.length > 0) {
      return {
        isValid: false,
        reason: `Missing required columns: ${missingColumns.join(', ')}`,
      };
    }

    for (const item of items) {
      for (const field of this.REQUIRED_FIELDS) {
        if (!item[field as keyof ProviderItem]) {
          return {
            isValid: false,
            reason: `Item with SKU ${item.sku} is missing the required field: ${field}`,
          };
        }
      }

      if (
        item.providerCode.trim().toLowerCase() !== provider.code.toLowerCase()
      ) {
        return {
          isValid: false,
          reason: `Provider code mismatch in SKU ${item.sku}. Expected: ${provider.code}, Found: ${item.providerCode}`,
        };
      }
    }

    return { isValid: true, items };
  }

  private async createCatalogProviderVersion(
    providerId: string,
    filePath: string,
  ): Promise<CatalogProviderVersion | undefined> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lastVersion = await tx.catalogProviderVersion.findFirst({
          where: { providerId },
          orderBy: { versionNumber: 'desc' },
        });

        const nextVersion = lastVersion ? lastVersion.versionNumber + 1 : 1;

        return await tx.catalogProviderVersion.create({
          data: {
            providerId,
            versionNumber: nextVersion,
            originalFile: filePath,
            status: CatalogVersionStatus.PROCESSING,
          },
        });
      });
    } catch {
      await this.auditService.log({
        action: AuditAction.CATALOG_PROCESSING_FAILED,
        metadata: {
          providerId,
          filePath,
          reason: 'Database error creating version',
        },
      });
      return undefined;
    }
  }

  private async saveCatalogItems(
    providerId: string,
    catalogProviderVersion: CatalogProviderVersion,
    items: ProviderItem[],
    filePath: string,
  ): Promise<boolean> {
    try {
      await this.catalogItemModel.insertMany(
        items.map((item) => ({
          providerId,
          catalogVersionId: catalogProviderVersion.id,
          providerCode: item.providerCode,
          sku: item.sku,
          name: item.name,
          description: item.description,
          category: item.category,
          active: false,
          tags: item.tags ? item.tags.split('|').map((t) => t.trim()) : [],
          attributes: item,
        })),
        { ordered: false },
      );
      return true;
    } catch (error) {
      await this.handleProcessFailure(
        providerId,
        catalogProviderVersion.id,
        filePath,
        `MongoDB Insert Error: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async generateVectorsForItems(
    providerId: string,
    catalogProviderVersion: CatalogProviderVersion,
    items: ProviderItem[],
    filePath: string,
  ): Promise<{ success: boolean; vectorDbItems: ProductVectorDocument[] }> {
    const vectorDbItems: ProductVectorDocument[] = [];
    for (const item of items) {
      // generate the embedding text for the item
      const embeddingText = this.embeddingsService.buildItemEmbeddingText(item);
      let attempt = 0;
      while (attempt < this.MAX_RETRIES) {
        try {
          const embedding = await this.embeddingsService.getEmbeddings({
            text: embeddingText,
          });
          vectorDbItems.push({
            id: `${providerId}#${item.sku}`,
            values: embedding,
            metadata: {
              providerId,
              catalogVersionId: catalogProviderVersion.id,
              name: item.name,
              category: item.category,
              brand: item.brand,
              color: item.color,
              material: item.material,
              size: item.size,
              tags: item.tags ? item.tags.replace(/\s/g, ',') : undefined,
            },
          });

          break; // if everything is ok
        } catch (error: unknown) {
          attempt++;

          if (error instanceof EmbeddingGenerationException) {
            // if not es retryable, throw error inmediatly
            if (!error.retryable) {
              await this.handleProcessFailure(
                providerId,
                catalogProviderVersion.id,
                filePath,
                `Non-retryable OpenAI error: ${error.message}`,
              );
              return { success: false, vectorDbItems: [] };
            }

            // if retryable and there are attempts left, wait
            if (attempt < this.MAX_RETRIES) {
              // is exponential backoff with jitter because the error could be due to rate limits
              // or temporary issues with the embedding service, so we want to wait a bit
              // before retrying, and we add some randomness to avoid thundering herd problem
              const delay = this.BASE_DELAY_MS * 2 ** (attempt - 1);
              await new Promise((res) => setTimeout(res, delay));
              continue;
            }
          }
          await this.handleProcessFailure(
            providerId,
            catalogProviderVersion.id,
            filePath,
            `Failed to generate embeddings after ${this.MAX_RETRIES} attempts. Error: ${(error as Error).message}`,
          );
          return { success: false, vectorDbItems: [] };
        }
      }
    }
    // if we have generated all the vectors, we can return them
    return { success: true, vectorDbItems };
  }

  private async upsertVectorsToVectorDb(
    providerId: string,
    catalogProviderVersion: CatalogProviderVersion,
    vectorDbItems: ProductVectorDocument[],
    filePath: string,
  ): Promise<boolean> {
    let upsertAttempt = 0;
    while (upsertAttempt < this.MAX_RETRIES) {
      try {
        await this.vectorDbService.upsertProviderVectors({
          providerId,
          newVectors: vectorDbItems,
        });
        break;
      } catch (error: unknown) {
        upsertAttempt++;
        if (error instanceof VectorDbException) {
          // if not es retryable, throw error inmediatly
          if (!error.retryable) {
            await this.handleProcessFailure(
              providerId,
              catalogProviderVersion.id,
              filePath,
              `Non-retryable Pinecone error: ${error.message}`,
            );
            return false;
          }

          if (upsertAttempt < this.MAX_RETRIES) {
            const delay = this.BASE_DELAY_MS * 2 ** (upsertAttempt - 1);
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }
        }
        await this.handleProcessFailure(
          providerId,
          catalogProviderVersion.id,
          filePath,
          `Failed to upsert vectors after ${this.MAX_RETRIES} attempts. Error: ${(error as Error).message}`,
        );
        return false;
      }
    }
    return true;
  }

  private async finalizeCatalogVersion(
    providerId: string,
    catalogProviderVersion: CatalogProviderVersion,
    uploaderUserId: string,
    filePath: string,
  ): Promise<void> {
    let lastActiveVersionId: string | null = null;

    try {
      // 1. change status in Prisma to active
      await this.prisma.$transaction(async (tx) => {
        // get the latest active version
        const lastActiveVersion = await tx.catalogProviderVersion.findFirst({
          where: { providerId, status: CatalogVersionStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
        });

        // set to archived the old version
        if (
          lastActiveVersion &&
          lastActiveVersion.id !== catalogProviderVersion.id
        ) {
          lastActiveVersionId = lastActiveVersion.id;
          await tx.catalogProviderVersion.update({
            where: { id: lastActiveVersion.id },
            data: { status: CatalogVersionStatus.ARCHIVED },
          });
        }
        // update the new version to active
        await tx.catalogProviderVersion.update({
          where: { id: catalogProviderVersion.id },
          data: { status: CatalogVersionStatus.ACTIVE },
        });
      });

      // Now we have an official latest version in Prisma

      // 2. change to active the items in MongoDB document
      await this.catalogItemModel.updateMany(
        { providerId, catalogVersionId: catalogProviderVersion.id },
        { $set: { active: true } },
      );

      // deactivate the old items if it exists
      if (lastActiveVersionId) {
        await this.catalogItemModel.updateMany(
          { providerId, catalogVersionId: lastActiveVersionId },
          {
            $set: { active: false },
            $currentDate: { archivedAt: true },
          },
        );
      }

      // 3. clean pinecone. Here I applied Zero downtime to avoid services interruptions
      // Now that the new version is active and users are already querying it,
      // we can safely delete the vectors from the previous version.
      if (lastActiveVersionId) {
        try {
          await this.vectorDbService.deleteVectorsByVersion({
            providerId,
            catalogVersionId: lastActiveVersionId,
          });
        } catch (pineconeError) {
          console.error(
            `Error deleting old Pinecone vectors for version ${lastActiveVersionId}:`,
            pineconeError,
          );
        }
      }

      // log the last audit log
      await this.auditService.log({
        action: AuditAction.CATALOG_PROCESSING_SUCCEEDED,
        metadata: {
          providerId,
          filePath,
          uploaderUserId,
        },
      });
    } catch (error: unknown) {
      // 4. Total rollback if activation fails
      console.error(
        'Error updating catalog version status to ACTIVE, initiating rollback:',
        error,
      );

      await this.handleProcessFailure(
        providerId,
        catalogProviderVersion.id,
        filePath,
        `Failed to finalize catalog version activation. Error: ${(error as Error).message}`,
      );

      // manual rollback: Delete vectors that we wer upserting in step 5
      // because this version was never activated
      try {
        await this.vectorDbService.deleteVectorsByVersion({
          providerId,
          catalogVersionId: catalogProviderVersion.id,
        });
      } catch (rollbackError) {
        console.error(
          `CRITICAL: Failed to rollback Pinecone vectors for failed version ${catalogProviderVersion.id}:`,
          rollbackError,
        );
      }
    }
  }

  // private async uploadCatalog(input: ProcessCatalogInput): Promise<void> {
  //   const { providerId, filePath, uploaderUserId } = input;

  //   const { isValid, items } = await this.validateCatalogPreconditions(
  //     input.providerId,
  //     input.filePath,
  //   );
  //   if (!isValid) {
  //     return;
  //   }

  //   // step2: add record in CatalogProviderVersion with status PROCESSING, and get the versionId
  //   const catalogProviderVersion: CatalogProviderVersion | undefined =
  //     await this.createCatalogProviderVersion(providerId, filePath);
  //   if (!catalogProviderVersion) {
  //     return;
  //   }

  //   // step3: save the items in MongoDB with the versionIdUUID, number of version nd providerUUID, active: false
  //   const itemsSaved = await this.saveCatalogItems(
  //     providerId,
  //     catalogProviderVersion,
  //     items,
  //     filePath,
  //   );
  //   if (!itemsSaved) {
  //     return;
  //   }

  //   // step4: for each item, generate embeddings for the items and build the array of items with the vector
  //   const { success, vectorDbItems } = await this.generateVectorsForItems(
  //     providerId,
  //     catalogProviderVersion,
  //     items,
  //     filePath,
  //   );

  //   if (!success) {
  //     return;
  //   }

  //   // setp5: Save in the database vector
  //   const vectorsSaved = await this.upsertVectorsToVectorDb(
  //     providerId,
  //     catalogProviderVersion,
  //     vectorDbItems,
  //     filePath,
  //   );

  //   if (!vectorsSaved) {
  //     return;
  //   }

  //   // step6: update the CatalogProviderVersion status to ACTIVE
  //   // finalize: deactivate the previous version of the catalog if exists ONLY after the new version is active
  //   await this.finalizeCatalogVersion(
  //     providerId,
  //     catalogProviderVersion,
  //     uploaderUserId,
  //     filePath,
  //   );
  // }

  private async uploadCatalog(input: ProcessCatalogInput): Promise<void> {
    const { providerId, filePath, uploaderUserId } = input;

    const catalogVersion = await this.createCatalogProviderVersion(
      providerId,
      filePath,
    );
    if (!catalogVersion) return;

    try {
      const { isValid, items, reason } =
        await this.validateCatalogPreconditions(providerId, filePath);

      if (!isValid) {
        await this.handleProcessFailure(
          providerId,
          catalogVersion.id,
          filePath,
          reason || 'Validation failed',
        );
        return;
      }

      if (
        !(await this.saveCatalogItems(
          providerId,
          catalogVersion,
          items,
          filePath,
        ))
      )
        return;

      const { success, vectorDbItems } = await this.generateVectorsForItems(
        providerId,
        catalogVersion,
        items,
        filePath,
      );
      if (!success) return;

      if (
        !(await this.upsertVectorsToVectorDb(
          providerId,
          catalogVersion,
          vectorDbItems,
          filePath,
        ))
      )
        return;

      await this.finalizeCatalogVersion(
        providerId,
        catalogVersion,
        uploaderUserId,
        filePath,
      );
    } catch (error) {
      await this.handleProcessFailure(
        providerId,
        catalogVersion.id,
        filePath,
        `Critical system error: ${(error as Error).message}`,
      );
    }
  }

  processCatalog(input: ProcessCatalogInput): void {
    void this.queueService.add(() => this.uploadCatalog(input));
  }
}
