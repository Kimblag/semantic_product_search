import { AuthMetadata } from '../../interfaces/auth-metadata.interface';

export type LoginInput = AuthMetadata & {
  email: string;
  password: string;
};
