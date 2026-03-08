import type { AxiosError, AxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, setTokens } from "../auth/tokenStorage";
import type { AuthTokens, AuthUser, LoginCredentials } from "../types/auth";
import { api, type RetriableRequestConfig } from "./api";

type TokenResponse = {
  accessToken: string;
  refreshToken?: string;
};

type CurrentUserResponse = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

let currentAccessToken: string | null = getAccessToken();
let refreshPromise: Promise<string> | null = null;
const authClearedListeners = new Set<() => void>();

function isAuthRoute(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("/auth/login") || url.includes("/auth/refresh");
}

function isLogoutRoute(url: string | undefined): boolean {
  return Boolean(url && url.includes("/auth/logout"));
}

export function getCurrentAccessToken(): string | null {
  return currentAccessToken;
}

export function setCurrentAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function persistTokens(tokens: AuthTokens): void {
  setCurrentAccessToken(tokens.accessToken);
  setTokens(tokens);
}

export function clearAuthState(): void {
  setCurrentAccessToken(null);
  clearTokens();

  authClearedListeners.forEach((listener) => {
    listener();
  });
}

export function subscribeAuthCleared(listener: () => void): () => void {
  authClearedListeners.add(listener);

  return () => {
    authClearedListeners.delete(listener);
  };
}

export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const response = await api.post<TokenResponse>("/auth/login", credentials);
  const tokens: AuthTokens = {
    accessToken: response.data.accessToken,
  };

  persistTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = api
    // OWASP-friendly flow: refresh token stays in httpOnly cookie only.
    .post<TokenResponse>("/auth/refresh", {})
    .then((response) => {
      const tokens: AuthTokens = {
        accessToken: response.data.accessToken,
      };
      persistTokens(tokens);
      return tokens.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function logout(): Promise<void> {
  try {
    // Backend should revoke refresh token from cookie/session context.
    await api.post("/auth/logout", {});
  } finally {
    clearAuthState();
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await api.get<CurrentUserResponse>("/users/me");
  return {
    id: response.data.id,
    email: response.data.email,
    name: response.data.name,
    roles: response.data.roles,
  };
}

export async function restoreSession(): Promise<string | null> {
  const storedAccessToken = getAccessToken();
  if (storedAccessToken) {
    setCurrentAccessToken(storedAccessToken);
    return storedAccessToken;
  }

  try {
    return await refreshAccessToken();
  } catch {
    clearAuthState();
    return null;
  }
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  await api.patch(`/auth/${userId}/reset-password`, { newPassword });
}

api.interceptors.request.use((config) => {
  if (!isAuthRoute(config.url) && currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = (error.config ?? {}) as AxiosRequestConfig & RetriableRequestConfig;
    const shouldRefresh =
      error.response?.status === 401 &&
      !originalConfig._retry &&
      !isAuthRoute(originalConfig.url) &&
      !isLogoutRoute(originalConfig.url);

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalConfig.headers = {
        ...originalConfig.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      return await api(originalConfig);
    } catch (refreshError) {
      clearAuthState();
      return Promise.reject(refreshError);
    }
  },
);
