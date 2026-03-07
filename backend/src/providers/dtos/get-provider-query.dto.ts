import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class GetProviderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  code?: string | undefined;

  @IsOptional()
  @IsString()
  name?: string | undefined;

  @IsOptional()
  @IsString()
  email?: string | undefined;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;
}
