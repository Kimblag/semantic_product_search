import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CatalogProviderVersion, Prisma, Provider } from '@prisma/client';
import { Model } from 'mongoose';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { ProviderItem } from 'src/csv/types/provider-item.type';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { EmbeddingGenerationException } from 'src/embeddings/exceptions/embedding-generation.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { CatalogVersionStatus } from 'src/providers/enums/catalog-version-status.enum';
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
  ) {}

  private async validateCatalogPreconditions(
    providerId: string,
    filePath: string,
  ): Promise<ValidateCatalogPreconditionsOutput> {
    let isValid = true;
    // arrange: Check if the provider exists
    const provider: Provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    // this service will be running in the background, so we cannot return errors to the user,
    // but we can log them and set the catalog version status to FAILED,
    // so the user can see that the processing failed when they check the catalog versions
    if (!provider) {
      isValid = false;
      // just log the error, the record in catalog provider does not exist yet
      await this.auditService.log({
        action: AuditAction.CATALOG_PROCESSING_FAILED,
        metadata: {
          providerId,
          reason: 'Provider not found',
        },
      });
      return;
    }

    // step1: read csv and get items
    const items: ProviderItem[] =
      await this.csvService.readCsv<ProviderItem>(filePath);

    // check if items is empty
    if (!items || items.length === 0) {
      isValid = false;
      await this.auditService.log({
        action: AuditAction.CATALOG_PROCESSING_FAILED,
        metadata: {
          providerId,
          filePath,
          reason: 'CSV file is empty or invalid',
        },
      });
      return;
    }

    // check if items have the required fields
    for (const item of items) {
      for (const field of this.REQUIRED_FIELDS) {
        if (!item[field]) {
          isValid = false;
          await this.auditService.log({
            action: AuditAction.CATALOG_PROCESSING_FAILED,
            metadata: {
              providerId,
              filePath,
              reason: `Missing required field ${field} in item with SKU ${item.sku}`,
            },
          });
          return;
        }
      }
    }

    // check if all the items has the correct provider code that matches with the provider code of the provider
    for (const item of items) {
      // normalize the provider code
      const normalizedProviderCode = item.providerCode.trim().toLowerCase();
      if (normalizedProviderCode !== provider.code) {
        isValid = false;
        await this.auditService.log({
          action: AuditAction.CATALOG_PROCESSING_FAILED,
          metadata: {
            providerId,
            filePath,
            reason: `Invalid provider code ${item.providerCode} in item with SKU ${item.sku}. Expected provider code: ${provider.code}`,
          },
        });
        return;
      }
    }

    return { isValid, provider, items };
  }

  async processCatalog(input: ProcessCatalogInput): Promise<void> {
    const { providerId, filePath, uploaderUserId } = input;

    const { isValid, provider, items } =
      await this.validateCatalogPreconditions(input.providerId, input.filePath);
    if (!isValid) {
      return;
    }

    // step2: add record in CatalogProviderVersion with status PROCESSING, and get the versionId
    let catalogProviderVersion: CatalogProviderVersion;
    let currentVersionNumber = 1;
    try {
      await this.prisma.$transaction(async (tx) => {
        // get the last version for the provider || or get the count of versions for the provider and add +1 for the new version

        const lastVersion = await tx.catalogProviderVersion.findFirst({
          where: { providerId, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        });
        currentVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
        catalogProviderVersion = await tx.catalogProviderVersion.create({
          data: {
            providerId,
            versionNumber: currentVersionNumber,
            originalFile: filePath,
            status: CatalogVersionStatus.PROCESSING,
          },
        });
        currentVersionNumber = catalogProviderVersion.versionNumber;
      });
    } catch (error: unknown) {
      let reason = 'Unknown error';
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // get the error code and information of the error and log it in audit with the providerId and filePath
        if (error.code === 'P2002') {
          reason = 'Duplicate version number';
        }

        if (error.code === 'P2003') {
          reason = 'Foreign key constraint failed';
        }
      }
      await this.auditService.log({
        action: AuditAction.CATALOG_PROCESSING_FAILED,
        metadata: {
          providerId,
          filePath,
          reason,
        },
      });
      return;
    }

    if (!catalogProviderVersion) return;

    // step3: save the items in MongoDB with the versionIdUUID, number of version nd providerUUID, active: false
    try {
      await this.catalogItemModel.insertMany(
        items.map((item) => {
          const attributes: Record<string, unknown> = {};

          for (const key in item) {
            if (!this.REQUIRED_FIELDS.includes(key)) {
              const value = item[key as keyof typeof item];

              if (typeof value === 'string') {
                attributes[key] = value.trim();
              } else {
                attributes[key] = value;
              }
            }
          }
          return {
            providerId,
            catalogVersionId: catalogProviderVersion.id,
            providerCode: item.providerCode,
            sku: item.sku,
            name: item.name,
            description: item.description,
            category: item.category,
            active: false,
            tags: item.tags
              ? item.tags.split('|').map((tag) => tag.trim())
              : [],
            attributes,
          };
        }),
        { ordered: false }, // if something fails later we can clean the missing data
      );
    } catch (error: unknown) {
      // save the error in audit with the providerId and filePath
      await this.handleProcessFailure(
        providerId,
        catalogProviderVersion.id,
        filePath,
        `Error saving items to MongoDB: ${(error as Error).message}`,
      );
      return;
    }

    // step4: for each item, generate embeddings for the items and build the array of items with the vector
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
              return;
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
          return;
        }
      }
    }
    // setp5: Save in the database vector
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
            return;
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
        return;
      }
    }

    // step6: update the CatalogProviderVersion status to ACTIVE
    // finalize: deactivate the previous version of the catalog if exists ONLY after the new version is active
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

  private async handleProcessFailure(
    providerId: string,
    versionId: string,
    filePath: string,
    reason: string,
  ): Promise<void> {
    // register log audit
    await this.auditService.log({
      action: AuditAction.CATALOG_PROCESSING_FAILED,
      metadata: { providerId, filePath, reason },
    });

    // set FAILED version in Prisma
    await this.prisma.catalogProviderVersion.update({
      where: {
        id: versionId,
      },
      data: {
        status: CatalogVersionStatus.FAILED,
      },
    });

    // clean documents in mongoDb
    await this.catalogItemModel.deleteMany({
      providerId,
      catalogVersionId: versionId,
      active: false,
    });
  }
}
