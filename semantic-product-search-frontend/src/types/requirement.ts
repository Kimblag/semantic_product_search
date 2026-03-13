export type RequirementStatus = "PROCESSING" | "PROCESSED" | "ERROR";

export interface RequirementListItem {
  id: string;
  status: RequirementStatus;
  clientId: string;
  clientName: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

export interface GetRequirementHistoryParams {
  page: number;
  limit: number;
  clientId?: string;
  status?: RequirementStatus;
}
