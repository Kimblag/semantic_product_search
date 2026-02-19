import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RefreshToken } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as ms from 'ms';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/application/users.service';
import { IsLockedLogin } from '../dto/failed-login-response.dto';
import { TooManyRequestException } from '../exceptions/too-many-request.exception';
import { JwtPayloadRefresh } from '../interfaces/jwt-payload-refresh.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import { GetUserQueryInput } from 'src/users/application/inputs/get-user-query.input';
import { FailedLoginService } from './failed-login.service';
import { ChangeUserPasswordInput } from './inputs/change-user-password.input';
import { LoginInput } from './inputs/login.input';
import { RefreshTokenInput } from './inputs/refresh-token.input';
import { ResetUserPasswordInput } from './inputs/reset-user-password.input';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly failedLoginService: FailedLoginService,
    private readonly auditService: AuditService,
  ) {}

  getRefreshExpirySeconds(): number {
    const value = this.config.jwt.refreshExpiresIn; // "7d"
    return Math.floor(ms(value as ms.StringValue) / 1000);
  }

  private getAccessExpirySeconds(): number {
    const value = this.config.jwt.expiresIn; // "10m"
    return Math.floor(ms(value as ms.StringValue) / 1000);
  }

  private async generateAccessToken(
    userId: string,
    roles: string[],
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: userId,
      roles,
      iat: now,
    };
    try {
      return await this.jwtService.signAsync(payload, {
        secret: this.config.jwt.secret,
        expiresIn: this.getAccessExpirySeconds(),
      });
    } catch {
      throw new InternalServerErrorException(
        'Internal server error. Please try again.',
      );
    }
  }

  private async generateRefreshToken(
    userId: string,
    ip?: string,
    ua?: string,
    jtiRefresh?: string,
  ): Promise<string> {
    const expireInSeconds = this.getRefreshExpirySeconds();
    const nowInMs = Date.now();
    const expiresAt = new Date(nowInMs + expireInSeconds * 1000);

    const jti = jtiRefresh ? jtiRefresh : crypto.randomUUID();

    const payload: JwtPayloadRefresh = {
      sub: userId,
      jti,
      iat: Math.floor(nowInMs / 1000),
    };

    let token: string;
    let tokenHash: string;
    try {
      token = await this.jwtService.signAsync(payload, {
        secret: this.config.jwt.refreshSecret,
        expiresIn: this.getRefreshExpirySeconds(),
      });
      tokenHash = await bcrypt.hash(
        token,
        this.config.security.hashSaltRoundsRefresh,
      );
    } catch {
      throw new InternalServerErrorException(
        'Internal server error. Please try again.',
      );
    }

    try {
      await this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          jti,
          expiresAt,
          ipAddress: ip,
          userAgent: ua,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Resource conflict.');

        if (error.code === 'P2003')
          throw new ConflictException('Invalid reference.');

        if (error.code === 'P2025')
          throw new NotFoundException('Resource not found.');
      }
      throw error;
    }

    return token;
  }

  async signIn(
    input: LoginInput,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password, ip, ua } = input;

    // check if the user is locked
    await this.checkAccountLockStatus(email, ip, ua);

    const user = await this.userService.findUserByEmail(email);

    // check the user
    if (!user || !user.active) {
      this.failedLoginService.recordFailure(email);
      // log failed login
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        ip,
        userAgent: ua,
        metadata: { email },
      });

      throw new UnauthorizedException('Invalid credentials.');
    }

    // check the password
    const isValid = await this.userService.verifyPassword(
      user.passwordHash,
      password,
    );
    if (!isValid) {
      // Register failed attempt
      this.failedLoginService.recordFailure(email);

      // log failed login
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        ip,
        userAgent: ua,
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid credentials.');
    }
    const userRoles = user.roles.map((r) => r.rol.name);

    // create jwt access token and refresh token
    const accessToken = await this.generateAccessToken(user.id, userRoles);
    const refreshToken = await this.generateRefreshToken(user.id, ip, ua);

    // reset failed attempts on successful login
    this.failedLoginService.resetAttempts(email);
    await this.auditService.log({
      action: AuditAction.ACCOUNT_UNLOCKED,
      ip,
      userAgent: ua,
      userId: user.id,
    });

    // log successful login
    await this.auditService.log({
      action: AuditAction.LOGIN_SUCCESS,
      ip,
      userAgent: ua,
      userId: user.id,
    });
    return { accessToken, refreshToken };
  }

  private async checkAccountLockStatus(email: string, ip: string, ua: string) {
    const lockedStatus: IsLockedLogin = this.failedLoginService.isLocked(email);

    if (lockedStatus.locked) {
      await this.auditService.log({
        action: AuditAction.ACCOUNT_LOCKED,
        ip,
        userAgent: ua,
        metadata: {
          email,
          reason: 'Account locked due to too many failed login attempts',
        },
      });

      const remainingSeconds: number = lockedStatus.remainingMs
        ? Math.ceil(lockedStatus.remainingMs / 1000)
        : 0;
      throw new TooManyRequestException(
        `Blocked user login. Try again in ${remainingSeconds} seconds.`,
      );
    }
  }

  /* rotation and refresh behaviors */
  async refreshToken(
    input: RefreshTokenInput,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify token signature and get payload
    const tokenRecord: RefreshToken =
      await this.verifyAndGetRefreshToken(input);

    // revoke current token
    const newJti = crypto.randomUUID();

    try {
      await this.prisma.refreshToken.update({
        where: {
          id: tokenRecord.id,
        },
        data: {
          revoked: true,
          replacedBy: newJti,
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }

    // generate new refresh token
    const newToken = await this.generateRefreshToken(
      tokenRecord.userId,
      input.ip,
      input.ua,
      newJti,
    );

    // generate new access token
    const userQueryCommand: GetUserQueryInput = {
      id: tokenRecord.userId,
    };
    const user = await this.userService.findUserById(userQueryCommand.id);

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const accessToken = await this.generateAccessToken(
      user.id,
      user.roles.map((r) => r.rol.name),
    );

    await this.auditService.log({
      action: AuditAction.REFRESH_TOKEN_ISSUED,
      ip: input.ip,
      userAgent: input.ua,
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken: newToken,
    };
  }

  private async verifyAndGetRefreshToken(
    input: RefreshTokenInput,
  ): Promise<RefreshToken> {
    let payload: JwtPayloadRefresh;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayloadRefresh>(
        input.oldToken,
        { secret: this.config.jwt.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // find matching token
    let tokenRecord: RefreshToken;
    try {
      tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { jti: payload.jti },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
    if (
      !tokenRecord ||
      tokenRecord.revoked ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    let isMatch: boolean;
    try {
      isMatch = await bcrypt.compare(input.oldToken, tokenRecord.tokenHash);
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }

    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return tokenRecord;
  }

  async revokeTokenByToken(refreshToken: string): Promise<void> {
    const tokenRecord: RefreshToken = await this.verifyAndGetRefreshToken({
      oldToken: refreshToken,
    });

    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          id: tokenRecord.id,
        },
        data: {
          revoked: true,
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }

    await this.auditService.log({
      action: AuditAction.REFRESH_TOKEN_REVOKED,
      ip: tokenRecord.ipAddress,
      userAgent: tokenRecord.userAgent,
      userId: tokenRecord.userId,
    });
    await this.auditService.log({
      action: AuditAction.LOGOUT,
      ip: tokenRecord.ipAddress,
      userAgent: tokenRecord.userAgent,
      userId: tokenRecord.userId,
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revoked: false,
        },
        data: {
          revoked: true,
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
    await this.auditService.log({
      action: AuditAction.REFRESH_TOKEN_REVOKED,
      userId,
      metadata: {
        reason: 'All tokens revoked for user due to password change or reset',
      },
    });
  }

  // change password of a user
  async changeUserPassword(input: ChangeUserPasswordInput): Promise<void> {
    // search the user
    const user = await this.userService.findUserById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // check if the current password is correct
    const isValidCredential = await this.userService.verifyPassword(
      user.passwordHash,
      input.currentPassword,
    );

    if (!isValidCredential) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.userService.updatePassword(input.userId, input.newPassword);

    await this.revokeAllUserTokens(input.userId);
    await this.auditService.log({
      action: AuditAction.PASSWORD_CHANGED,
      userId: input.userId,
      metadata: {
        reason: 'Password changed by user',
      },
    });
  }

  // reset password of a user
  async resetUserPassword(input: ResetUserPasswordInput): Promise<void> {
    // check if user exists
    const user = await this.userService.findUserById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.userService.updatePassword(input.userId, input.newPassword);
    await this.revokeAllUserTokens(input.userId);
    await this.auditService.log({
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      targetUserId: input.userId,
      metadata: {
        reason: 'Password reset completed by admin',
      },
    });
  }
}
