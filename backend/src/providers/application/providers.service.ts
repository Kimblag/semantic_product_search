import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProviderResponseDto } from '../dtos/provider-response.dto';
import { CreateProviderInput } from './inputs/create-provider.input';
import { GetProviderQueryInput } from './inputs/get-provider-query.input';
import { UpdateProviderInput } from './inputs/update-provider.input';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { plainToInstance } from 'class-transformer';
import { GetCatalogItemsQueryDto } from '../dtos/get-catalog-items-query.dto';
import { CatalogItemResponseDto } from '../dtos/catalog-item-response.dto';
import { Model, QueryFilter } from 'mongoose';
import { CatalogItem } from '../schemas/provider-item.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(CatalogItem.name)
    private readonly catalogItemModel: Model<CatalogItem>,
  ) {}

  // create provider
  async createProvider(
    input: CreateProviderInput,
  ): Promise<ProviderResponseDto> {
    try {
      return await this.prisma.provider.create({
        data: {
          code: input.code,
          name: input.name,
          email: input.email,
          telephone: input.telephone,
          address: input.address,
        },
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          telephone: true,
          address: true,
          active: true,
          createdAt: true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Resource conflict.');

        if (error.code === 'P2025')
          throw new NotFoundException('Resource not found.');
      }
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // get all

  async findAllProviders(
    input: GetProviderQueryInput,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    const { page, limit } = input;
    const skip = (page - 1) * limit;
    const take = limit;
    let whereClause = {};

    if (input.code) {
      whereClause = {
        ...whereClause,
        code: input.code,
      };
    }

    if (input.email) {
      whereClause = {
        ...whereClause,
        email: {
          contains: input.email,
        },
      };
    }

    if (input.name) {
      whereClause = {
        ...whereClause,
        name: {
          contains: input.name,
        },
      };
    }

    if (input.isActive !== undefined) {
      whereClause = {
        ...whereClause,
        active: input.isActive,
      };
    }

    try {
      const [total, providers] = await this.prisma.$transaction([
        this.prisma.provider.count({ where: whereClause }),
        this.prisma.provider.findMany({
          where: whereClause,
          skip,
          take,
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            telephone: true,
            address: true,
            active: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        data: providers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // get by id
  async findProviderById(providerId: string): Promise<ProviderResponseDto> {
    try {
      const provider = await this.prisma.provider.findUnique({
        where: { id: providerId },
        include: {
          catalogProviderVersions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      if (!provider) {
        throw new NotFoundException(`Provider with ID ${providerId} not found`);
      }

      return plainToInstance(ProviderResponseDto, provider, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error retrieving provider details',
      );
    }
  }

  // update provider
  async updateProvider(input: UpdateProviderInput): Promise<void> {
    const data: Prisma.ProviderUpdateInput = {};

    if (input.code) {
      data.code = input.code;
    }

    if (input.name) {
      data.name = input.name;
    }

    if (input.email) {
      data.email = input.email;
    }

    if (input.telephone) {
      data.telephone = input.telephone;
    }

    if (input.address) {
      data.address = input.address;
    }

    if (input.active !== undefined) {
      data.active = input.active;
    }

    try {
      await this.prisma.provider.update({
        where: {
          id: input.id,
        },
        data,
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  async findCatalogItems(
    providerId: string,
    query: GetCatalogItemsQueryDto,
  ): Promise<PaginatedResponse<CatalogItemResponseDto>> {
    const { page, limit, q } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<CatalogItem> = {
      providerId,
      active: true,
    };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.catalogItemModel.countDocuments(filter),
      this.catalogItemModel.find(filter).skip(skip).limit(limit).lean(),
    ]);

    const dtos = plainToInstance(CatalogItemResponseDto, items, {
      excludeExtraneousValues: true,
    });

    return {
      data: dtos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
