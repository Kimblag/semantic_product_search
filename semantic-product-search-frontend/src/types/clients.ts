export interface Client {
  id: string;
  name: string;
  email: string;
  telephone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface ClientResponse extends Client {}

export interface GetClientsParams {
  page: number;
  limit: number;
  name?: string;
  email?: string;
  isActive?: boolean;
}

export interface CreateClientInput {
  name: string;
  email: string;
  telephone: string;
  address: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  isActive?: boolean;
}