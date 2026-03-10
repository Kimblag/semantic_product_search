import { Expose, Type } from 'class-transformer';

export class CatalogVersionResponseDto {
  @Expose() id: string;
  @Expose() versionNumber: number;
  @Expose() originalFile: string;
  @Expose() status: string;
  @Expose() errorMessage?: string;
  @Expose() createdAt: Date;
}

export class ProviderResponseDto {
  @Expose() id: string;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() email: string;
  @Expose() telephone: string;
  @Expose() address: string;
  @Expose() active: boolean;
  @Expose() createdAt: Date;

  @Expose()
  @Type(() => CatalogVersionResponseDto) // Mapea el array de objetos a instancias del DTO
  catalogProviderVersions?: CatalogVersionResponseDto[];
}
