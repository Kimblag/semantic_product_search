import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../dto/login.dto';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn({
      email: loginDto.email,
      password: loginDto.password,
    });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout() {
    return { message: 'Logout successful' };
  }
}
