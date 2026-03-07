import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';

export class GetHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: RequirementStatus,
    description: 'Filter history by requirement status',
  })
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @ApiPropertyOptional({
    description: 'Filter history by client ID',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter history by date (YYYY-MM-DD)',
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @ApiPropertyOptional({
    description: 'Filter history by requirement ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  requirementId?: string;
}

export class GetAdminHistoryQueryDto extends GetHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter history by user ID',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
