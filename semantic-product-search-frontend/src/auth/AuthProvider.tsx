import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAuthState,
  fetchCurrentUser,
  login,
  logout,
  restoreSession,
  subscribeAuthCleared,
} from "../api/auth";
import { AuthContext } from "./AuthContext";
import { isPublicAuthRoute } from "./config";
import type {
  AuthContextValue,
  AuthUser,
  LoginCredentials,
} from "../types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyUnauthenticatedState = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const initializeSession = useCallback(async (): Promise<void> => {
    setIsInitializing(true);

    try {
      const token = await restoreSession();

      if (!token) {
        applyUnauthenticatedState();
        return;
      }

      const currentUser = await fetchCurrentUser();
      setAccessToken(token);
      setUser(currentUser);
    } catch {
      clearAuthState();
      applyUnauthenticatedState();
    } finally {
      setIsInitializing(false);
    }
  }, [applyUnauthenticatedState]);

  useEffect(() => {
    let mounted = true;
    const currentPath = window.location.pathname;
    const shouldSkipBootstrap = isPublicAuthRoute(currentPath);

    const unsubscribe = subscribeAuthCleared(() => {
      if (!mounted) return;
      applyUnauthenticatedState();
      setIsInitializing(false);
    });

    (async () => {
      if (!mounted) return;

      if (shouldSkipBootstrap) {
        setIsInitializing(false);
        return;
      }

      await initializeSession();
    })();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applyUnauthenticatedState, initializeSession]);

  const signIn = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      const tokens = await login(credentials);
      const currentUser = await fetchCurrentUser();
      setAccessToken(tokens.accessToken);
      setUser(currentUser);
    } catch (error) {
      clearAuthState();
      applyUnauthenticatedState();
      throw error;
    }
  }, [applyUnauthenticatedState]);

  const signOut = useCallback(async (): Promise<void> => {
    await logout();
    applyUnauthenticatedState();
  }, [applyUnauthenticatedState]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    setIsInitializing(true);

    const token = await restoreSession();
    if (!token) {
      applyUnauthenticatedState();
      setIsInitializing(false);
      return false;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setAccessToken(token);
      setUser(currentUser);
      setIsInitializing(false);
      return true;
    } catch {
      clearAuthState();
      applyUnauthenticatedState();
      setIsInitializing(false);
      return false;
    }
  }, [applyUnauthenticatedState]);

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      isInitializing,
      signIn,
      signOut,
      refreshSession,
      hasAnyRole,
    }),
    [
      user,
      accessToken,
      isInitializing,
      signIn,
      signOut,
      refreshSession,
      hasAnyRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
