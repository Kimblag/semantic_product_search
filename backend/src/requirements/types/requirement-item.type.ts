// csv/types/requirement-item.type.ts
export type RequirementItemRaw = {
  productName: string; // product name
  description?: string; // product description, optional
  category?: string; // category, optional
  brand?: string; // brand, optional
  color?: string; // color, optional
  size?: string; // size, optional
  material?: string; // material, optional
  tags?: string[]; // tags, optional pipe separated, e.g. "tag1|tag2|tag3"
  comments?: string; // comments, optional
};
