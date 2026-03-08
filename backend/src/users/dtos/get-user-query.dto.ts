import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class GetUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search query - searches in email, name, and role names',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    enum: [true, false],
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;

    return undefined;
  })
  isActive?: boolean;
}
