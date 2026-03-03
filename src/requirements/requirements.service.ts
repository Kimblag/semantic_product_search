import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client, Requirement } from '@prisma/client';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { CsvService } from 'src/csv/csv.service';
import { RequirementMapper } from 'src/csv/mappers/requirement.mapper';
import { RequirementCsvItem } from 'src/csv/types/requirement-item-csv.type';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';
import { MatchingService } from 'src/matching/matching.service';
import { MatchingResultDocument } from 'src/matching/schemas/requirement-root-document.schema';
import { QueueService } from 'src/queue/queue.service';
import { RequirementItem } from 'src/requirements/types/requirement-item.type';
import { PrismaService } from '../prisma/prisma.service';
import { GetHistoryQueryDto } from './dtos/get-history-query.dto';
import {
  Match,
  RequirementMatchingResponseDto,
  ResultEntry,
} from './dtos/requirement-matchig-response.dto';
import { ProcessRequirementsInput } from './inputs/process-requirement.input';
import { RequirementFilteredItem } from './types/requirement-history.type';

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

  private async getRequirements(
    query: GetHistoryQueryDto,
    userId?: string,
  ): Promise<{ total: number; requirements: RequirementFilteredItem[] }> {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const whereClause = {
      ...(userId && { userId: userId }),
      ...(status && { status: status }),
      ...(query.date && { createdAt: { gte: query.date } }),
      ...(query.clientId && { clientId: query.clientId }),
    };

    try {
      const [total, requirements] = await this.prisma.$transaction([
        this.prisma.requirement.count({ where: whereClause }),
        this.prisma.requirement.findMany({
          where: whereClause,
          skip,
          take,
          select: {
            id: true,
            clientId: true,
            client: { select: { name: true } },
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return { total, requirements };
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  private async getMatches(
    requirementIds: string[],
  ): Promise<MatchingResultDocument[]> {
    try {
      return await this.matchingService.matchesResult(requirementIds);
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  private async getProvidersNames(
    providerIds: string[],
  ): Promise<Map<string, string>> {
    try {
      const providers = await this.prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, name: true },
      });

      const providerIdToNameMap = new Map<string, string>();
      providers.forEach((provider) => {
        providerIdToNameMap.set(provider.id, provider.name);
      });

      return providerIdToNameMap;
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  private mapToResponseDto(
    req: RequirementFilteredItem,
    results: ResultEntry[] = [],
  ): RequirementMatchingResponseDto {
    return {
      requirementId: req.id,
      clientId: req.clientId,
      client: req.client.name,
      status: req.status as RequirementStatus,
      createdAt: req.createdAt,
      results: results,
    };
  }

  private async enrichRequirementsWithMatches(
    requirements: RequirementFilteredItem[],
  ): Promise<RequirementMatchingResponseDto[]> {
    // Early return 1 - No requirements found for the user
    if (requirements.length === 0) return [];

    const requirementIds: string[] = requirements
      .filter((req) => req.status === RequirementStatus.PROCESSED)
      .map((req) => req.id);

    // Early return 2 - No processed requirements found
    if (requirementIds.length === 0) {
      return requirements.map((req) => this.mapToResponseDto(req, []));
    }

    const matches = await this.getMatches(requirementIds);

    // Early return 3 - No matching results found
    if (!matches || matches.length === 0) {
      return requirements.map((req) => this.mapToResponseDto(req, []));
    }

    // Extract unique Provider IDs
    const uniqueProviderIds = new Set<string>();
    matches.forEach((matchDoc) => {
      matchDoc.items.forEach((itemWrapper) => {
        itemWrapper.matches.forEach((match) => {
          uniqueProviderIds.add(match.providerId);
        });
      });
    });

    const providerIdToNameMap = await this.getProvidersNames(
      Array.from(uniqueProviderIds),
    );

    try {
      const historyByRequirementId = matches.reduce<
        Record<string, ResultEntry[]>
      >((acc, matchDoc: MatchingResultDocument) => {
        if (!acc[matchDoc.requirementId]) {
          acc[matchDoc.requirementId] = [];
        }

        const resultEntry: ResultEntry = {
          matchingId: matchDoc._id.toString(),
          createdAt: matchDoc.createdAt,
          items: matchDoc.items.map((i) => ({
            productName: i.item.productName,
            description: i.item.description,
            category: i.item.category,
            brand: i.item.brand,
            color: i.item.color,
            size: i.item.size,
            material: i.item.material,
            tags: i.item.tags,

            matches: i.matches.map(
              (m): Match => ({
                providerId: m.providerId,
                providerName:
                  providerIdToNameMap.get(m.providerId) || 'Unknown Provider',
                catalogItemId: m.catalogItemId,
                catalogVersionId: m.catalogVersionId,
                sku: m.sku,
                name: m.name,
                category: m.category,
                tags: m.tags,
                score: m.score,
              }),
            ),
          })),
        };

        acc[matchDoc.requirementId].push(resultEntry);
        return acc;
      }, {});

      const mergedHistory = requirements.map((req) => {
        const matchingResults = historyByRequirementId[req.id] || [];
        return this.mapToResponseDto(req, matchingResults);
      });

      return mergedHistory;
    } catch {
      throw new InternalServerErrorException(
        'Error processing history results',
      );
    }
  }

  async getUserHistory(
    userId: string,
    query: GetHistoryQueryDto,
  ): Promise<PaginatedResponse<RequirementMatchingResponseDto>> {
    const { page, limit } = query;
    const { total, requirements } = await this.getRequirements(query, userId);
    const result = await this.enrichRequirementsWithMatches(requirements);
    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllHistory(
    query: GetHistoryQueryDto,
  ): Promise<PaginatedResponse<RequirementMatchingResponseDto>> {
    const { page, limit } = query;
    const { total, requirements } = await this.getRequirements(query);
    const result = await this.enrichRequirementsWithMatches(requirements);
    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
