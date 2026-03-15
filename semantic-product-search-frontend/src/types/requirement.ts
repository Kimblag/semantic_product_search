import { PaginatedResponse } from "./common";

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

export interface Match {
  providerId: string;
  providerName: string;
  catalogItemId: string;
  catalogVersionId: string;
  sku: string;
  name: string;
  category?: string;
  tags?: string[];
  score: number;
}

export interface RequirementItem {
  productName: string;
  description?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  material?: string;
  tags?: string[];
  matches: Match[];
}

export interface ResultEntry {
  matchingId: string;
  items: PaginatedResponse<RequirementItem>;
  createdAt: string;
}

export interface RequirementMatchingResponse {
  requirementId: string;
  clientId: string;
  client: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: RequirementStatus;
  createdAt: string;
  results: ResultEntry[];
}
