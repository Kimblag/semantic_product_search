import { Provider } from '@prisma/client';
import { ProviderItem } from 'src/csv/types/provider-item.type';

export type ValidateCatalogPreconditionsOutput = {
  isValid: boolean;
  provider?: Provider | null;
  items?: ProviderItem[] | undefined;
};
