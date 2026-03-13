import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class GetCatalogItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
