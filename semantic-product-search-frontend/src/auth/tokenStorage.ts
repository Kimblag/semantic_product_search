let accessTokenMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function setTokens(tokens: { accessToken: string }): void {
  accessTokenMemory = tokens.accessToken;
}

export function clearTokens(): void {
  accessTokenMemory = null;
}
