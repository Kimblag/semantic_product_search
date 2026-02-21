// roles and its permissions response DTO
export class RoleListDto {
  id: string;
  name: string;
  description: string;
}

export class RoleDetailDto {
  id: string;
  name: string;
  description: string;
  permissions: {
    id: string;
    name: string;
    description: string;
  }[];
}
