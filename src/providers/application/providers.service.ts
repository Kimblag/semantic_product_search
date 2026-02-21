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

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

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
  ): Promise<ProviderResponseDto[]> {
    let whereClause: Prisma.ProviderWhereInput = {};

    if (input.code) {
      whereClause.code = input.code;
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
      whereClause.active = input.isActive;
    }

    try {
      return await this.prisma.provider.findMany({
        where: whereClause,
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
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // get by id
  async findProviderById(providerId: string): Promise<ProviderResponseDto> {
    try {
      return this.prisma.provider.findUnique({
        where: {
          id: providerId,
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
    } catch {
      throw new InternalServerErrorException('Internal server error.');
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
}
