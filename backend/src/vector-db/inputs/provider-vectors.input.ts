import { ProductVectorDocument } from '../interfaces/provider-item-vector-db.interface';

export type VectorInput = {} & ProductVectorDocument;

export type ProviderVectorsInput = {
  providerId: string;
  newVectors: Array<VectorInput>;
};
