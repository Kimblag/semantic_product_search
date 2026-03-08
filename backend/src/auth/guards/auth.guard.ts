import
  {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // verify if is a public route
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // get the request object from the execution context
    const request = context.switchToHttp().getRequest<Request>();

    // get the authorization header from the request
    const token = this.extractTokenFromHeader(request);

    // Check if there is an authorization header, if not throw UnauthorizedException
    if (!token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    // try to verfy the token with jwt service if the token is valid return true otherwise throw UnauthorizedException
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwt.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    try {
      // Search if user is active and get current roles
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          active: true,
          roles: {
            select: {
              rol: {
                select: { name: true },
              },
            },
          },
        },
      });

      // if user is deactivated: block
      if (!user || !user.active) {
        throw new UnauthorizedException('User account is deactivated');
      }

      // update roles
      payload.roles = user.roles.map((r) => r.rol.name);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error; // re-throw if it's an UnauthorizedException
      }
      // fallback for any other errors (e.g., database issues)
      throw new UnauthorizedException('Unable to verify user status');
    }

    request.user = payload;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    // if there is no authorization header return undefined
    if (!authHeader) {
      return undefined;
    }

    // split the authorization header by space and return the second part which is the token
    const [type, token] = authHeader.split(' ');

    // check if the type is bearer
    if (type !== 'Bearer') {
      return undefined;
    }

    // return the token
    return token;
  }
}
