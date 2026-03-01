import { Injectable } from '@nestjs/common';
import { ProcessRequirementsInput } from './inputs/process-requirement.input';
import { Client, Requirement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CsvService } from 'src/csv/csv.service';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { RequirementItem } from 'src/requirements/types/requirement-item.type';
import { MatchingService } from 'src/matching/matching.service';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';
import { RequirementCsvItem } from 'src/csv/types/requirement-item-csv.type';
import { RequirementMapper } from 'src/csv/mappers/requirement.mapper';
import { QueueService } from 'src/queue/queue.service';

@Injectable()
export class RequirementsService {
  private readonly TEMPLATE_COLUMNS: string[] = [
    'productName',
    'description',
    'category',
    'brand',
    'color',
    'size',
    'material',
    'tags',
    'comments',
  ];
  private readonly REQUIRED_FIELDS: string[] = ['productName'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvService: CsvService,
    private readonly auditService: AuditService,
    private readonly matchingService: MatchingService,
    private readonly queueService: QueueService,
  ) {}

  private async logFailure(clientId: string, filePath: string, reason: string) {
    await this.auditService.log({
      action: AuditAction.REQUIREMENTS_PROCESSING_FAILED,
      metadata: {
        clientId,
        filePath,
        reason,
      },
    });
  }

  private async validateRequirementsPreconditions(
    clientId: string,
    filePath: string,
  ): Promise<{ isValid: boolean; items?: RequirementItem[] }> {
    // arrange: Check if the client exists
    const client: Client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    // this service will be running in the background, so we cannot return errors to the user,
    // but we can log them and set the catalog version status to FAILED,
    // so the user can see that the processing failed when they check the catalog versions
    if (!client) {
      // just log the error, the record in catalog provider does not exist yet
      await this.logFailure(clientId, filePath, 'Client not found');
      return { isValid: false };
    }

    // step1: read csv and get items
    const { results: items, headers } =
      await this.csvService.readCsv<RequirementCsvItem>(filePath);

    // check if items is empty
    if (!items || items.length === 0) {
      await this.logFailure(clientId, filePath, 'CSV file is empty or invalid');
      return { isValid: false };
    }

    // check if the csv has the headers we expect
    const missingColumns = this.TEMPLATE_COLUMNS.filter(
      (col) => !headers.includes(col),
    );

    const extraColumns = headers.filter(
      (col) => !this.TEMPLATE_COLUMNS.includes(col),
    );

    if (missingColumns.length > 0 || extraColumns.length > 0) {
      await this.logFailure(
        clientId,
        filePath,
        `CSV file has missing columns: ${missingColumns.join(', ')} or extra columns: ${extraColumns.join(', ')}`,
      );
      return { isValid: false };
    }

    // check items have the required fields
    for (const item of items) {
      for (const field of this.REQUIRED_FIELDS) {
        const value: unknown = item[field];
        if (typeof value !== 'string' || value.trim().length === 0) {
          await this.logFailure(
            clientId,
            filePath,
            `Missing required field ${field} in item ${item.productName}`,
          );
          return { isValid: false };
        }
      }
    }

    // map items to requirement items
    const requirements = RequirementMapper.toRequirementItems(items);

    return { isValid: true, items: requirements };
  }

  async processRequirements(input: ProcessRequirementsInput): Promise<void> {
    const { clientId, filePath, uploaderUserId } = input;

    const { isValid, items } = await this.validateRequirementsPreconditions(
      clientId,
      filePath,
    );

    if (!isValid) {
      return;
    }
    const requirement: Requirement = await this.prisma.requirement.create({
      data: {
        clientId: clientId,
        userId: uploaderUserId,
        originalFile: filePath,
        status: RequirementStatus.PROCESSING,
      },
    });

    // Call the matching service to match requirements to the catalog
    void this.queueService.add(() =>
      this.matchingService.matchRequirementsToCatalog(
        requirement,
        items,
        uploaderUserId,
      ),
    );
  }
}
