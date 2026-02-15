import { AuthMetadata } from './auth-metadata.interface';

export type RefreshTokenCommand = AuthMetadata & {
  oldToken: string;
};
