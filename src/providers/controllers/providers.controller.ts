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
import { ProvidersService } from '../application/providers.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateProviderDto } from '../dtos/create-provider.dto';
import { Response } from 'express';
import { ProviderResponseDto } from '../dtos/provider-response.dto';
import { GetProviderQueryDto } from '../dtos/get-provider-query.dto';
import { UpdateProviderDto } from '../dtos/update-provider.dto';

@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // create provider
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() dto: CreateProviderDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providersService.createProvider({
      code: dto.code,
      name: dto.name,
      email: dto.email,
      telephone: dto.telephone,
      address: dto.address,
    });

    res.setHeader('Location', `/providers/${provider.id}`);

    return provider;
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(@Query() filters: GetProviderQueryDto) {
    return await this.providersService.findAllProviders({
      code: filters.code,
      name: filters.name,
      email: filters.email,
      isActive: filters.isActive,
    });
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') providerId: string) {
    return await this.providersService.findProviderById(providerId);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(
    @Param('id') providerId: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return await this.providersService.updateProvider({
      id: providerId,
      code: dto.code,
      name: dto.name,
      email: dto.email,
      telephone: dto.telephone,
      address: dto.address,
      active: dto.active,
    });
  }
}
