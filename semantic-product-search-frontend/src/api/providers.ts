import { PaginatedResponse } from "@/types/common";
import { api } from "./api";
import {
  CreateProviderData,
  ProviderDetail,
  ProviderListItem,
  UpdateProviderData,
} from "@/types/providers";

interface FetchProvidersParams {
  page?: number;
  limit?: number;
  code?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
}

export async function fetchProvidersList(
  params: FetchProvidersParams = {},
): Promise<PaginatedResponse<ProviderListItem>> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.code) queryParams.append("code", params.code);
  if (params.name) queryParams.append("name", params.name);
  if (params.email) queryParams.append("email", params.email);

  if (params.isActive !== undefined) {
    queryParams.append("isActive", params.isActive.toString());
  }

  const response = await api.get<PaginatedResponse<ProviderListItem>>(
    `/providers?${queryParams.toString()}`,
  );
  return response.data;
}

export async function createProvider(
  data: CreateProviderData,
): Promise<ProviderListItem> {
  const response = await api.post<ProviderListItem>("/providers", data);
  return response.data;
}

export async function fetchProviderDetail(
  providerId: string,
): Promise<ProviderDetail> {
  const response = await api.get<ProviderDetail>(`/providers/${providerId}`);
  return response.data;
}

export async function updateProvider(
  providerId: string,
  data: UpdateProviderData,
): Promise<void> {
  await api.patch(`/providers/${providerId}`, data);
}

export async function uploadProviderCatalog(
  providerId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  await api.post(`/providers/${providerId}/catalog`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadProviderTemplate(): Promise<void> {
  const response = await api.get("/providers/template", {
    responseType: "blob",
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "provider-template.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
}