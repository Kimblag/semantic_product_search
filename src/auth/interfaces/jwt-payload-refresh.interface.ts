export interface JwtPayloadRefresh {
  iat: number; // issued at time (timestamp)
  jti: string; // unique identifier for the token
  sub: string; // user ID
}
