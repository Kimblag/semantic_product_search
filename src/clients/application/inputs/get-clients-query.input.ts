export type GetClientsQueryInput = {
  name?: string | undefined;
  email?: string | undefined;
  active?: boolean;
  page: number;
  limit: number;
};
