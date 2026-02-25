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
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as multer from 'multer';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
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

@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providersCatalogService: ProvidersCatalogService,
    private readonly uploadsService: UploadsService,
  ) {}

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

  // upload catalog
  @Roles(Role.ADMIN)
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
    @Req() request: Request,
  ) {
    const currentUser: JwtPayload = request.user;
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
      uploaderUserId: currentUser.sub, // pass the user that is uploading
    });

    return;
  }
}
