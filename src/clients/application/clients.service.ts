import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientInput } from './inputs/create-client.input';
import { Prisma } from '@prisma/client';
import { ClientResponseDto } from '../dtos/client-response.dto';
import { plainToInstance } from 'class-transformer';
import { GetClientsQueryInput } from './inputs/get-clients-query.input';
import { UpdateClientInput } from './inputs/update-client.input';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // create client
  async createClient(input: CreateClientInput): Promise<ClientResponseDto> {
    try {
      const client = await this.prisma.client.create({
        data: {
          name: input.name,
          email: input.email,
          address: input.address,
          telephone: input.telephone,
        },
      });
      return plainToInstance(ClientResponseDto, client, {
        excludeExtraneousValues: true,
      });
    } catch (error: unknown) {
      // errors by prisma:
      // client already exists (email) - conflict
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Resource conflict.');
      }

      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // get all clients
  async findAllClients(
    input: GetClientsQueryInput,
  ): Promise<ClientResponseDto[]> {
    const whereClause: Prisma.ClientWhereInput = {};

    if (input.name) {
      whereClause.name = input.name;
    }

    if (input.email) {
      whereClause.email = input.email;
    }

    if (input.active !== undefined) {
      whereClause.active = input.active;
    }

    try {
      return await this.prisma.client.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          address: true,
          telephone: true,
          active: true,
          createdAt: true,
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // get client by id

  async findClientById(id: string): Promise<ClientResponseDto | null> {
    try {
      return await this.prisma.client.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          address: true,
          telephone: true,
          active: true,
          createdAt: true,
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // Update client
  async updateClient(input: UpdateClientInput): Promise<void> {
    // check what the user wants to update, because all fields
    // are optional except id, so we need to create the data object dynamically
    const data: Prisma.ClientUpdateInput = {};
    if (input.name) {
      data.name = input.name;
    }
    if (input.email) {
      data.email = input.email;
    }
    if (input.address) {
      data.address = input.address;
    }
    if (input.telephone) {
      data.telephone = input.telephone;
    }

    if (input.isActive !== undefined) {
      data.active = input.isActive;
    }

    try {
      await this.prisma.client.update({
        where: {
          id: input.id,
        },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Resource not found.');
        }

        if (error.code === 'P2002') {
          throw new ConflictException('Resource conflict.');
        }
      }

      throw new InternalServerErrorException('Internal server error.');
    }
  }
}
