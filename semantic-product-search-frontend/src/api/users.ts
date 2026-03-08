import { api } from "./api";
import type { UsersListResponse } from "../types/user";

interface FetchUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

export interface UserRoleDetail {
  id: string;
  name: string;
}

export interface UserDetailResponse {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: string;
  roles: UserRoleDetail[];
}

interface RawRoleData {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface RawUserRolePivot {
  userId: string;
  rolId: string;
  rol: RawRoleData;
}

interface RawUserDetailResponse {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: string;
  roles: RawUserRolePivot[];
}

export async function fetchUsersList(
  params: FetchUsersParams = {},
): Promise<UsersListResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.q) queryParams.append("q", params.q);
  if (params.isActive !== undefined)
    queryParams.append("isActive", params.isActive.toString());

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

export async function createUser(data: CreateUserData): Promise<void> {
  await api.post("/users", data);
}

export async function fetchUserDetail(
  userId: string,
): Promise<UserDetailResponse> {
  const response = await api.get<RawUserDetailResponse>(`/users/${userId}`);
  const data = response.data;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    active: data.active,
    createdAt: data.createdAt,
    roles: data.roles.map((item) => ({
      id: item.rol.id,
      name: item.rol.name,
    })),
  };
}

export async function updateUserName(
  userId: string,
  name: string,
): Promise<void> {
  await api.patch(`/users/${userId}/name`, { name });
}

export async function updateUserEmail(
  userId: string,
  newEmail: string,
): Promise<void> {
  await api.patch(`/users/${userId}/email`, { newEmail });
}

export async function updateUserRoles(
  userId: string,
  roles: string[],
): Promise<void> {
  await api.put(`/users/${userId}/roles`, { roles });
}
