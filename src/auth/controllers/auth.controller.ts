import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuthService } from '../application/auth.service';
import { ChangeUserPasswordCommand } from '../application/commands/change-user-password.command';
import { RefreshTokenCommand } from '../application/commands/refresh-token.command';
import { ResetUserPasswordCommand } from '../application/commands/reset-user-password.command';
import { Public } from '../decorators/public.decorator';
import {
  ChangeUserPasswordDto,
  ResetUserPasswordDto,
} from '../dto/change-user-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenResponseDto } from '../dto/refresh-token-response.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LoginResponseDto } from '../dto/login-response.dto';

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
  ): Promise<LoginResponseDto> {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || undefined;
    return await this.authService.signIn({
      email: loginDto.email,
      password: loginDto.password,
      ip,
      ua: userAgent,
    });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<RefreshTokenResponseDto> {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || undefined;
    const command: RefreshTokenCommand = {
      oldToken: dto.refreshToken,
      ip,
      ua: userAgent,
    };
    return await this.authService.refreshToken(command);
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
    const currentUser = request.user;
    if (!currentUser) throw new UnauthorizedException();
    const command: ChangeUserPasswordCommand = {
      userId: currentUser.sub,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    };
    await this.authService.changeUserPassword(command);
  }

  // reset password
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/reset-password')
  async resetPassword(
    @Body() data: ResetUserPasswordDto,
    @Param('id') userId: string,
  ): Promise<void> {
    const command: ResetUserPasswordCommand = {
      userId: userId,
      newPassword: data.newPassword,
    };
    await this.authService.resetUserPassword(command);
  }
}
