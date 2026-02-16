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
import { GetUserQueryCommand } from 'src/users/application/commands/get-user-query.command';
import { UsersService } from 'src/users/application/users.service';
import { IsLockedLogin } from '../dto/failed-login-response.dto';
import { TooManyRequestException } from '../exceptions/too-many-request.exception';
import { JwtPayloadRefresh } from '../interfaces/jwt-payload-refresh.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ChangeUserPasswordCommand } from './commands/change-user-password.command';
import { LoginCommand } from './commands/login.command';
import { RefreshTokenCommand } from './commands/refresh-token.command';
import { ResetUserPasswordCommand } from './commands/reset-user-password.command';
import { FailedLoginService } from './failed-login.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly failedLoginService: FailedLoginService,
  ) {}

  private getRefreshExpirySeconds(): number {
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
    command: LoginCommand,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password, ip, ua } = command;

    // check if the user is locked
    const lockedStatus: IsLockedLogin = this.failedLoginService.isLocked(email);

    if (lockedStatus.locked) {
      const remainingSeconds: number = lockedStatus.remainingMs
        ? Math.ceil(lockedStatus.remainingMs / 1000)
        : 0;
      throw new TooManyRequestException(
        `Blocked user login. Try again in ${remainingSeconds} seconds.`,
      );
    }

    const user = await this.userService.findUserByEmail(email);

    // check the user
    if (!user || !user.active) {
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
      throw new UnauthorizedException('Invalid credentials.');
    }
    const userRoles = user.roles.map((r) => r.rol.name);

    // create jwt access token and refresh token
    const accessToken = await this.generateAccessToken(user.id, userRoles);
    const refreshToken = await this.generateRefreshToken(user.id, ip, ua);

    // reset failed attempts on successful login
    this.failedLoginService.resetAttempts(email);
    return { accessToken, refreshToken };
  }

  /* rotation and refresh behaviors */
  async refreshToken(
    command: RefreshTokenCommand,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify token signature and get payload
    const tokenRecord: RefreshToken =
      await this.verifyAndGetRefreshToken(command);

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
      command.ip,
      command.ua,
      newJti,
    );

    // generate new access token
    const userQueryCommand: GetUserQueryCommand = {
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

    return {
      accessToken,
      refreshToken: newToken,
    };
  }

  private async verifyAndGetRefreshToken(
    command: RefreshTokenCommand,
  ): Promise<RefreshToken> {
    let payload: JwtPayloadRefresh;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayloadRefresh>(
        command.oldToken,
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
      isMatch = await bcrypt.compare(command.oldToken, tokenRecord.tokenHash);
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
  }

  // change password of a user
  async changeUserPassword(command: ChangeUserPasswordCommand): Promise<void> {
    // search the user
    const user = await this.userService.findUserById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // check if the current password is correct
    const isValidCredential = await this.userService.verifyPassword(
      user.passwordHash,
      command.currentPassword,
    );

    if (!isValidCredential) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.userService.updatePassword(command.userId, command.newPassword);

    await this.revokeAllUserTokens(command.userId);
  }

  // reset password of a user
  async resetUserPassword(command: ResetUserPasswordCommand): Promise<void> {
    // check if user exists
    const user = await this.userService.findUserById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.userService.updatePassword(command.userId, command.newPassword);
    await this.revokeAllUserTokens(command.userId);
  }
}
