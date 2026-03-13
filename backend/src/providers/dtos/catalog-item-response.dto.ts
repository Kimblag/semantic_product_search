import { Expose } from 'class-transformer';

export class CatalogItemResponseDto {
  @Expose() id: string;
  @Expose() sku: string;
  @Expose() name: string;
  @Expose() description: string;
  @Expose() category: string;
  @Expose() tags: string[];
  @Expose() attributes: Record<string, unknown>;
}
