import {
  RequirementListItem,
  GetRequirementHistoryParams,
} from "@/types/requirement";
import { PaginatedResponse } from "@/types/common";
import { api } from "./api";

export const fetchRequirements = async (
  params: GetRequirementHistoryParams,
  isAdmin: boolean,
): Promise<PaginatedResponse<RequirementListItem>> => {
  const query = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  });
  if (params.clientId) query.append("clientId", params.clientId);
  if (params.status) query.append("status", params.status);

  const endpoint = isAdmin ? "/requirements/admin" : "/requirements";
  const response = await api.get<PaginatedResponse<RequirementListItem>>(
    `${endpoint}?${query.toString()}`,
  );
  return response.data;
};

export const uploadRequirementFile = async (
  clientId: string,
  file: File,
): Promise<void> => {
  const formData = new FormData();
  formData.append("file", file);
  await api.post(`/requirements/${clientId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const downloadRequirementTemplate = async (): Promise<void> => {
  const response = await api.get("/requirements/template", {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "requirement-template.csv");
  document.body.appendChild(link);
  link.click();

  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
