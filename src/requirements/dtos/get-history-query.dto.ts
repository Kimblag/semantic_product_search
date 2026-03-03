import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class GetHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: RequirementStatus,
    description: 'Filter history by requirement status',
  })
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;
}
