import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';

export class Match {
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

export class RequirementItem {
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

export class RequirementItems {
  item: RequirementItem[];
}

export class ResultEntry {
  matchingId: string;
  items: RequirementItem[];
  createdAt: Date;
}

export class RequirementMatchingResponseDto {
  requirementId: string;
  clientId: string;
  client: string;
  status: RequirementStatus;
  createdAt: Date;
  results: ResultEntry[];
}
