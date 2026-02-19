import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuthService } from '../application/auth.service';
import { ChangeUserPasswordInput } from '../application/inputs/change-user-password.input';
import { RefreshTokenInput } from '../application/inputs/refresh-token.input';
import { ResetUserPasswordInput } from '../application/inputs/reset-user-password.input';
import { Public } from '../decorators/public.decorator';
import {
  ChangeUserPasswordDto,
  ResetUserPasswordDto,
} from '../dto/change-user-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // add throttle to login endpoint, max 5 requests per minute
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<Response> {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || undefined;

    const { accessToken, refreshToken } = await this.authService.signIn({
      email: loginDto.email,
      password: loginDto.password,
      ip,
      ua: userAgent,
    });
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // cross domain change to none
      maxAge: this.authService.getRefreshExpirySeconds() * 1000,
    });

    return response.json({ accessToken });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<Response> {
    const ip: string = request.ip;
    const userAgent: string = request.headers['user-agent'] || undefined;
    const input: RefreshTokenInput = {
      oldToken: dto.refreshToken,
      ip,
      ua: userAgent,
    };
    const { accessToken, refreshToken } =
      await this.authService.refreshToken(input);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // cross domain change to none
      maxAge: this.authService.getRefreshExpirySeconds() * 1000,
    });

    return response.json({ accessToken });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeTokenByToken(dto.refreshToken);
  }

  // change password
  @Roles(Role.EXECUTIVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('change-password')
  async changePassword(
    @Body() data: ChangeUserPasswordDto,
    @Req() request: Request,
  ): Promise<void> {
    const currentUser: JwtPayload = request.user;
    if (!currentUser) throw new UnauthorizedException();
    const input: ChangeUserPasswordInput = {
      userId: currentUser.sub,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    };
    await this.authService.changeUserPassword(input);
  }

  // reset password
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/reset-password')
  async resetPassword(
    @Body() data: ResetUserPasswordDto,
    @Param('id') userId: string,
  ): Promise<void> {
    const input: ResetUserPasswordInput = {
      userId: userId,
      newPassword: data.newPassword,
    };
    await this.authService.resetUserPassword(input);
  }
}
