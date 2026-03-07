export interface JwtPayload {
  sub: string;
  roles: string[];
  iat: number;
}
