// csv/types/client-item.type.ts
export type ClientCsvItem = {
  name: string; // product name
  preferredBrand?: string; // preferred brand, optional
  category?: string; // category, optional
  comments?: string; // additional comments. e.g. "color: red| size: M | material: cotton", optional
};
