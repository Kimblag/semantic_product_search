import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client, Requirement } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
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
import { RequirementItemRaw } from 'src/requirements/types/requirement-item.type';

import { flattenRequirementsForCsv } from 'src/common/mappers/requirement-to-csv.mapper';
import { PassThrough } from 'stream';
import { CsvDataRow } from 'src/csv/types/requirement-export.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProcessRequirementsInput } from '../inputs/process-requirement.input';
import { RequirementFilteredItem } from '../types/requirement-history.type';
import {
  GetAdminHistoryQueryDto,
  GetHistoryQueryDto,
} from '../dtos/get-history-query.dto';
import {
  Match,
  RequirementItem,
  RequirementMatchingResponseDto,
  ResultEntry,
} from '../dtos/requirement-matchig-response.dto';
import { RequirementResponseDto } from '../dtos/requirement-response.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

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
  ): Promise<{ isValid: boolean; items?: RequirementItemRaw[] }> {
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

    // Log the start of processing
    await this.auditService.log({
      action: AuditAction.REQUIREMENT_PROCESSING_STARTED,
      userId: input.uploaderUserId,
      metadata: {
        filePath: filePath,
        clientId: clientId,
        requirementId: requirement.id,
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
      ...(query.requirementId && { id: query.requirementId }),
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
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
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
      userId: req.userId,
      userName: req.user.name,
      userEmail: req.user.email,
      status: req.status as RequirementStatus,
      createdAt: req.createdAt,
      results: results,
    };
  }

  private async enrichRequirementsWithMatches(
    requirements: RequirementFilteredItem[],
    page: number = 1,
    limit: number = 10,
  ): Promise<RequirementMatchingResponseDto[]> {
    if (requirements.length === 0) return [];

    const requirementIds: string[] = requirements
      .filter((req) => req.status === RequirementStatus.PROCESSED)
      .map((req) => req.id);

    if (requirementIds.length === 0) {
      return requirements.map((req) => this.mapToResponseDto(req, []));
    }

    const matches = await this.getMatches(requirementIds);

    if (!matches || matches.length === 0) {
      return requirements.map((req) => this.mapToResponseDto(req, []));
    }

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

        const allItems: RequirementItem[] = matchDoc.items.map((i) => ({
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
        }));

        const totalItems = allItems.length;
        const safePage = Number(page) || 1;
        const safeLimit = Number(limit) || 10;
        const skip = (safePage - 1) * safeLimit;

        const paginatedData = allItems.slice(skip, skip + safeLimit);

        const resultEntry: ResultEntry = {
          matchingId: matchDoc._id.toString(),
          createdAt: matchDoc.createdAt,
          items: {
            data: paginatedData,
            meta: {
              total: totalItems,
              page: safePage,
              limit: safeLimit,
              totalPages: Math.ceil(totalItems / safeLimit) || 1,
            },
          },
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

  async getRequirementByUser(
    userId: string,
    requirementId: string,
    query: PaginationQueryDto, // <-- Añadido
  ): Promise<RequirementMatchingResponseDto> {
    const { requirements } = await this.getRequirements(
      { requirementId },
      userId,
    );
    const result = await this.enrichRequirementsWithMatches(
      requirements,
      query.page,
      query.limit,
    );
    return result.length > 0 ? result[0] : null;
  }

  async getRequirementsByUser(
    userId: string,
    query: GetHistoryQueryDto,
  ): Promise<PaginatedResponse<RequirementResponseDto>> {
    const { page, limit } = query;
    const { total, requirements: result } = await this.getRequirements(
      query,
      userId,
    );

    const requirements: RequirementResponseDto[] = plainToInstance(
      RequirementResponseDto,
      result,
      {
        excludeExtraneousValues: true,
      },
    );
    return {
      data: requirements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllRequirementsAdmin(
    query: GetAdminHistoryQueryDto,
  ): Promise<PaginatedResponse<RequirementResponseDto>> {
    const { page, limit, userId } = query;
    const { total, requirements: result } = await this.getRequirements(
      query,
      userId,
    );

    const requirements: RequirementResponseDto[] = plainToInstance(
      RequirementResponseDto,
      result,
      {
        excludeExtraneousValues: true,
      },
    );
    return {
      data: requirements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRequirementAdmin(
    requirementId: string,
    query?: PaginationQueryDto,
  ): Promise<RequirementMatchingResponseDto | null> {
    const { requirements } = await this.getRequirements(
      { requirementId },
      null,
    );
    const result = await this.enrichRequirementsWithMatches(
      requirements,
      query.page,
      query.limit,
    );
    return result.length > 0 ? result[0] : null;
  }

  async exportRequirementsCsv(requirementId: string): Promise<{
    stream: PassThrough;
    headers: string[];
  }> {
    const requirement = await this.getRequirementAdmin(requirementId, null);

    if (!requirement) {
      throw new InternalServerErrorException('Requirement not found');
    }
    const rows: CsvDataRow[] = flattenRequirementsForCsv([requirement]);

    const headers: string[] = [
      'requirementId',
      'clientName',
      'createdAt',
      'itemName',
      'itemCategory',
      'itemBrand',
      'itemColor',
      'matchProvider',
      'matchSku',
      'matchName',
      'matchCategory',
      'matchScore',
    ];

    const stream: PassThrough = this.csvService.exportCsvStream(rows, headers);

    return { stream, headers };
  }
}
