import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import * as multer from 'multer';
import { join } from 'path';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enums/role.enum';
import { UploadSubdir } from 'src/storage/uploads/enums/upload-subdir.enum';
import { UploadsService } from 'src/storage/uploads/uploads.service';
import { ProvidersCatalogService } from '../application/providers-catalog.service';
import { ProvidersService } from '../application/providers.service';
import { CreateProviderDto } from '../dtos/create-provider.dto';
import { GetProviderQueryDto } from '../dtos/get-provider-query.dto';
import { ProviderResponseDto } from '../dtos/provider-response.dto';
import { UpdateProviderDto } from '../dtos/update-provider.dto';
import { ProviderCatalogFilePipe } from './pipes/provider-catalog-file.pipe';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { GetCatalogItemsQueryDto } from '../dtos/get-catalog-items-query.dto';
import { CatalogItemResponseDto } from '../dtos/catalog-item-response.dto';

@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providersCatalogService: ProvidersCatalogService,
    private readonly uploadsService: UploadsService,
  ) {}

  // Download template
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get('template')
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Download provider template CSV file.',
    schema: { type: 'string', format: 'binary' },
  })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="provider-template.csv"')
  getTemplate(): StreamableFile {
    const pathToTemplate = join(
      process.cwd(),
      'src',
      'common',
      'templates',
      'csv',
      'provider-template.csv',
    );

    if (!existsSync(pathToTemplate)) {
      throw new NotFoundException(
        'Template CSV file not found. Please contact the administrator.',
      );
    }

    const fileStream = createReadStream(pathToTemplate);
    return new StreamableFile(fileStream);
  }

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
  async findAll(
    @Query() filters: GetProviderQueryDto,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    return await this.providersService.findAllProviders({
      code: filters.code,
      name: filters.name,
      email: filters.email,
      isActive: filters.isActive,
      page: filters.page,
      limit: filters.limit,
    });
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') providerId: string): Promise<ProviderResponseDto> {
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

  // upload catalog
  @Roles(Role.ADMIN)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/catalog')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
    required: true,
  })
  // use memory storage to avoid saving invalid files to disk before processing
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadCatalog(
    @UploadedFile(new ProviderCatalogFilePipe())
    file: Express.Multer.File,
    @Param('id') providerId: string,
    @User() user: JwtPayload,
  ): void {
    // ensure the uploads/providers directory exists
    const filePath = this.uploadsService.saveBuffer(
      UploadSubdir.PROVIDERS,
      file.originalname,
      file.buffer,
      providerId,
    );
    void this.providersCatalogService.processCatalog({
      providerId,
      filePath,
      uploaderUserId: user.sub, // pass the user that is uploading
    });

    return;
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get(':id/items')
  async findCatalogItems(
    @Param('id') providerId: string,
    @Query() query: GetCatalogItemsQueryDto,
  ): Promise<PaginatedResponse<CatalogItemResponseDto>> {
    return await this.providersService.findCatalogItems(providerId, query);
  }
}
