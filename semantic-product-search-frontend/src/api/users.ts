import { api } from "./api";
import type { UsersListResponse } from "../types/user";

interface FetchUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
}

export async function fetchUsersList(params: FetchUsersParams = {}): Promise<UsersListResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.q) queryParams.append("q", params.q);
  if (params.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());

  const query = queryParams.toString();
  const url = query ? `/users?${query}` : "/users";

  const response = await api.get<UsersListResponse>(url);
  return response.data;
}

export async function deactivateUser(userId: string): Promise<void> {
  await api.patch(`/users/${userId}/deactivate`);
}

export async function reactivateUser(userId: string): Promise<void> {
  await api.patch(`/users/${userId}/reactivate`);
}
