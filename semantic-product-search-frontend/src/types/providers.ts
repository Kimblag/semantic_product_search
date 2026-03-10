export interface ProviderListItem {
  id: string;
  code: string;
  name: string;
  email: string;
  telephone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface CreateProviderData {
  code: string;
  name: string;
  email: string;
  telephone: string;
  address: string;
}

export interface UpdateProviderData extends Partial<CreateProviderData> {
  active?: boolean;
}

export type CatalogStatus = "PROCESSING" | "ACTIVE" | "FAILED" | "ARCHIVED";

export interface CatalogVersion {
  id: string;
  versionNumber: number;
  originalFile: string;
  status: CatalogStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface ProviderListItem {
  id: string;
  code: string;
  name: string;
  email: string;
  telephone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface ProviderDetail extends ProviderListItem {
  catalogProviderVersions: CatalogVersion[];
}

export interface CreateProviderData {
  code: string;
  name: string;
  email: string;
  telephone: string;
  address: string;
}

export interface UpdateProviderData extends Partial<CreateProviderData> {
  active?: boolean;
}
