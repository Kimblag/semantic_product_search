// csv/types/provider-item.type.ts
export type ProviderItem = {
  sku: string; // product code assigned by the provider, unique per provider
  name: string; // product name
  description: string; // product description
  category: string; // product category
  tags?: string; // pipe-separated, optional: "tag1|tag2|tag3"
  brand?: string; // main brand
  color?: string; // color
  size?: string; // size, optional
  material?: string; // material, optional
  providerCode: string; // provider code (not the id)
};
