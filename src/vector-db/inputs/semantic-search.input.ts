export type SemanticSearchInput = {
  vectors: number[];
  filter?: Record<string, unknown> | null;
};
