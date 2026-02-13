import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { LoginCommand } from './commands/login.command';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}
  async signIn(loginCommand: LoginCommand): Promise<{ accessToken: string }> {
    const { email, password } = loginCommand;
    const user = await this.userService.findByEmail(email);

    // check the user
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.active) {
      throw new UnauthorizedException();
    }

    // check the password
    const isValid = await this.userService.verifyPassword(
      user.passwordHash as string,
      password,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // create jwt token
    const payload: JwtPayload = {
      sub: user.id,
      roles: user.roles.map((role) => role.rol.name),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
