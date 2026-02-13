import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../interfaces/request-user.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {

    // verify if is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // can activate if is public route
    if (isPublic) {
      return true;
    }

    //  Get the required roles from the route handler or controller using the reflector
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check if there are any required roles, if not return true to allow access
    if (!requiredRoles) {
      return true;
    }
    // get the user from the request object, which was set by the AuthGuard after verifying the JWT token
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user.roles) {
      return false;
    }
    // compare roles required by the route handler or controller with the roles of the user,
    // if there is any match return true to allow access otherwise return false to deny access
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
