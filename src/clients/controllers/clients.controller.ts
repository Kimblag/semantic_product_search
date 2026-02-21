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
import { ClientsService } from '../application/clients.service';
import { CreateClientDto } from '../dto/client-create.dto';
import { ClientResponseDto } from '../dto/client-response.dto';
import { GetClientQueryDto } from '../dto/get-client-query.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

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
    @Query() filters: GetClientQueryDto,
  ): Promise<ClientResponseDto[]> {
    return this.clientsService.findAllClients({
      name: filters.name,
      email: filters.email,
      active: filters.isActive,
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
