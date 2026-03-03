import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { ClientsService } from '../application/clients.service';
import { CreateClientDto } from '../dtos/client-create.dto';
import { ClientResponseDto } from '../dtos/client-response.dto';
import { GetClientQueryDto } from '../dtos/get-client-query.dto';
import { UpdateClientDto } from '../dtos/update-client.dto';

@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // create
  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() dto: CreateClientDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ClientResponseDto> {
    const client = await this.clientsService.createClient({
      name: dto.name,
      email: dto.email,
      address: dto.address,
      telephone: dto.telephone,
    });

    res.setHeader('Location', `/clients/${client.id}`);

    return client;
  }

  // find all
  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(
    @Query() query: GetClientQueryDto,
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    return this.clientsService.findAllClients({
      name: query.name,
      email: query.email,
      active: query.isActive,
      page: query.page,
      limit: query.limit,
    });
  }

  // find one
  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') clientId: string): Promise<ClientResponseDto> {
    return this.clientsService.findClientById(clientId);
  }

  // update client
  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(@Param('id') clientId: string, @Body() dto: UpdateClientDto) {
    await this.clientsService.updateClient({
      id: clientId,
      name: dto.name,
      email: dto.email,
      address: dto.address,
      telephone: dto.telephone,
      isActive: dto.isActive,
    });
  }
}
