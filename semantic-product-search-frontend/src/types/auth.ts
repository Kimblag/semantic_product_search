export const APP_ROLES = ["Superuser", "Admin", "Executive"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
};

export type AuthUser = {
  id: string;
  roles: string[];
  email?: string;
  name?: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasAnyRole: (roles: string[]) => boolean;
};
