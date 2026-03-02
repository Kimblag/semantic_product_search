import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { createReadStream, existsSync } from 'fs';
import * as multer from 'multer';
import { join } from 'path';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enums/role.enum';
import { UploadSubdir } from 'src/storage/uploads/enums/upload-subdir.enum';
import { UploadsService } from 'src/storage/uploads/uploads.service';
import { RequirementFilePipe } from './pipes/requirement-file.pipe';
import { RequirementsService } from './requirements.service';
import { RequirementMatchingResponseDto } from './dtos/requirement-matchig-response.dto';
import { GetHistoryQueryDto } from './dtos/get-history-query.dto';

@ApiBearerAuth()
@Controller('requirements')
export class RequirementsController {
  constructor(
    private readonly requirementsService: RequirementsService,
    private readonly uploadsService: UploadsService,
  ) {}

  // Download template
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  @HttpCode(HttpStatus.OK)
  @Get('template')
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Download requirement template CSV file.',
    schema: { type: 'string', format: 'binary' },
  })
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="requirement-template.csv"',
  )
  getTemplate(): StreamableFile {
    const pathToTemplate = join(
      process.cwd(),
      'src',
      'common',
      'templates',
      'csv',
      'requirement-template.csv',
    );

    if (!existsSync(pathToTemplate)) {
      throw new NotFoundException(
        'Template CSV file not found. Please contact the administrator.',
      );
    }

    const fileStream = createReadStream(pathToTemplate);
    return new StreamableFile(fileStream);
  }

  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get('history')
  async getHistory(
    @User() user: JwtPayload,
    @Query() query: GetHistoryQueryDto,
  ): Promise<RequirementMatchingResponseDto[]> {
    return await this.requirementsService.history(user.sub, query.status);
  }

  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id')
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadRequiements(
    @UploadedFile(new RequirementFilePipe())
    file: Express.Multer.File,
    @Param('id') clientId: string,
    @User() user: JwtPayload,
  ): void {
    const filePath: string = this.uploadsService.saveBuffer(
      UploadSubdir.REQUIREMENTS,
      file.originalname,
      file.buffer,
      clientId,
    );

    void this.requirementsService.processRequirements({
      clientId,
      filePath,
      uploaderUserId: user.sub,
    });

    return;
  }
}
