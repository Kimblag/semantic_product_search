export interface ProductVectorDocument {
  id: string; // provider item id (providerCode#sku)
  values: number[]; // embedding

  metadata: {
    providerId: string; // provider id
    catalogVersionId: string; // catalog version id
    category: string;
    brand?: string | undefined;
    material?: string | undefined;
    size?: string | undefined;
    color?: string | undefined;
    tags?: string | undefined;
  };
}
