import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  database: {
    url: process.env.DATABASE_URL,
  },

  mongo: {
    url: process.env.MONGO_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    issuer: process.env.JWT_ISSUER,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN_SECONDS,
  },

  security: {
    hashSaltRounds: Number(process.env.HASH_SALT_ROUNDS),
    hashSaltRoundsRefresh: Number(process.env.HASH_SALT_ROUNDS_REFRESH),
    maxFailedAttempts: Number(process.env.MAX_FAILED_ATTEMPTS),
    lockTime: Number(process.env.LOCK_TIME),
  },
}));
