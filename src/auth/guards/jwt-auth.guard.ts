import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // get the request object from the execution context
    const request = context.switchToHttp().getRequest<Request>();

    // get the authorization header from the request
    const token = this.extractTokenFromHeader(request);

    // Check if there is an authorization header, if not throw UnauthorizedException
    if (!token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    // try to verfy the token  with jwt service if the token is valid return true otherwise throw UnauthorizedException
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // return
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
