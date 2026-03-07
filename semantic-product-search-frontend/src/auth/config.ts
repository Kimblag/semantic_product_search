export const PUBLIC_AUTH_ROUTES = ["/login"] as const;

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.includes(pathname as (typeof PUBLIC_AUTH_ROUTES)[number]);
}
