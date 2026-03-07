export type UserRole = {
  id: string;
  name: string;
};

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  active: boolean;
  createdAt: string;
};

export type UsersListResponse = {
  data: UserListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
