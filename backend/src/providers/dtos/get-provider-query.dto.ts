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
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;

    return undefined;
  })
  isActive?: boolean = true;
}
