export type SemanticSearchInput = {
  vector: number[];
  topK: number;
  filter?: Record<string, unknown> | null;
};
