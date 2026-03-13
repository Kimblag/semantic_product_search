import { Client, ClientResponse, GetClientsParams } from "@/types/clients";
import { PaginatedResponse } from "@/types/common";
import { api } from "./api";

export const fetchClients = async (
  params: GetClientsParams,
): Promise<PaginatedResponse<ClientResponse>> => {
  const query = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  });
  if (params.name) query.append("name", params.name);
  if (params.email) query.append("email", params.email);
  if (params.isActive !== undefined)
    query.append("isActive", params.isActive.toString());

  const response = await api.get<PaginatedResponse<ClientResponse>>(
    `/clients?${query.toString()}`,
  );
  return response.data;
};

export const fetchClientById = async (id: string): Promise<ClientResponse> => {
  const response = await api.get<ClientResponse>(`/clients/${id}`);
  return response.data;
};

export const updateClient = async (
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt">>,
): Promise<void> => {
  await api.patch(`/clients/${id}`, data);
};
