import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class ProviderCatalogFilePipe
  implements PipeTransform<Express.Multer.File>
{
  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
  ];

  transform(file: Express.Multer.File): Express.Multer.File {
    // if not file
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.validateSize(file);
    this.validateMimeType(file);
    this.validateExtension(file);
    return file;
  }

  private validateSize(file: Express.Multer.File): void {
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException(
        `File size should not exceed ${this.MAX_SIZE / (1024 * 1024)} MB`,
      );
    }
  }

  private validateMimeType(file: Express.Multer.File): void {
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only CSV files are allowed');
    }
  }

  private validateExtension(file: Express.Multer.File): void {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext !== '.csv') {
      throw new BadRequestException('File extension must be .csv');
    }
  }
}
