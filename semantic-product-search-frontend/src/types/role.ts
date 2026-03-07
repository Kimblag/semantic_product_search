export type RoleListItem = {
  id: string;
  name: string;
  description: string;
};

export type RolePermission = {
  id: string;
  name: string;
  description: string;
};

export type RoleDetail = RoleListItem & {
  permissions: RolePermission[];
};
