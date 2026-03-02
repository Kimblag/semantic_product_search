import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';

export class GetHistoryQueryDto {
  @ApiPropertyOptional({
    enum: RequirementStatus,
    description: 'Filter history by requirement status',
  })
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;
}
