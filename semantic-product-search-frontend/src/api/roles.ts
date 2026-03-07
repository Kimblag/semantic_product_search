import { api } from "./api";
import type { RoleDetail, RoleListItem } from "../types/role";

export async function fetchRolesList(): Promise<RoleListItem[]> {
  const response = await api.get<RoleListItem[]>("/roles");
  return response.data;
}

export async function fetchRoleDetail(roleId: string): Promise<RoleDetail | null> {
  const response = await api.get<RoleDetail | null>(`/roles/${roleId}`);
  return response.data;
}
