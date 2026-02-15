import { AuthMetadata } from './auth-metadata.interface';

export type LoginCommand = AuthMetadata & {
  email: string;
  password: string;
};
