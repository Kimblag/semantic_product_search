export type GetProviderQueryInput = {
  code?: string;
  name?: string;
  email?: string;
  isActive?: boolean | undefined;
  page: number;
  limit: number;
};
