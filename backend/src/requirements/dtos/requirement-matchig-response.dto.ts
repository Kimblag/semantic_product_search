import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { ApiProperty } from '@nestjs/swagger';

export class Match {
  @ApiProperty()
  providerId: string;
  @ApiProperty()
  providerName: string;
  @ApiProperty()
  catalogItemId: string;
  @ApiProperty()
  catalogVersionId: string;
  @ApiProperty()
  sku: string;
  @ApiProperty()
  name: string;
  @ApiProperty({ required: false })
  category?: string;
  @ApiProperty({ required: false, type: [String] })
  tags?: string[];
  @ApiProperty()
  score: number;
}

export class RequirementItem {
  @ApiProperty()
  productName: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty({ required: false })
  category?: string;
  @ApiProperty({ required: false })
  brand?: string;
  @ApiProperty({ required: false })
  color?: string;
  @ApiProperty({ required: false })
  size?: string;
  @ApiProperty({ required: false })
  material?: string;
  @ApiProperty({ required: false, type: [String] })
  tags?: string[];
  @ApiProperty({ type: () => [Match] })
  matches: Match[];
}

class PaginationMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

class PaginatedRequirementItemDto {
  @ApiProperty({ type: () => [RequirementItem] })
  data: RequirementItem[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ResultEntry {
  @ApiProperty()
  matchingId: string;

  @ApiProperty({ type: () => PaginatedRequirementItemDto })
  items: PaginatedResponse<RequirementItem>;

  @ApiProperty()
  createdAt: Date;
}

export class RequirementMatchingResponseDto {
  @ApiProperty()
  requirementId: string;
  @ApiProperty()
  clientId: string;
  @ApiProperty()
  client: string;
  @ApiProperty()
  userId: string;
  @ApiProperty()
  userName: string;
  @ApiProperty()
  userEmail: string;
  @ApiProperty({ enum: RequirementStatus })
  status: RequirementStatus;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty({ type: () => [ResultEntry] })
  results: ResultEntry[];
}
