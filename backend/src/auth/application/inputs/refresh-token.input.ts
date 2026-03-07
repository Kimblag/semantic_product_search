import { AuthMetadata } from '../../interfaces/auth-metadata.interface';

export type RefreshTokenInput = AuthMetadata & {
  oldToken: string;
};
