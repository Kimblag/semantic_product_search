export type GetProviderQueryInput = {
  code?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  page: number;
  limit: number;
};
