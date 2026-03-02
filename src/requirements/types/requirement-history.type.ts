import { RequirementStatus } from '@prisma/client';

export type RequirementFilteredItem = {
  clientId: string;
  id: string;
  status: RequirementStatus;
  createdAt: Date;
  client: {
    name: string;
  };
};
