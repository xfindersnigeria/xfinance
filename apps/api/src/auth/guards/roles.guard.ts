import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { systemRole } from 'prisma/generated/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) return true;

    // In standalone mode, superadmin-only routes do not exist — surface as 404
    // (not 403) so the route is invisible rather than forbidden.
    // Routes that also allow admin (e.g. @Roles(admin, superadmin)) are left
    // untouched; admins can still reach them in standalone.
    if (
      process.env.DEPLOYMENT_MODE === 'standalone' &&
      requiredRoles.every((r) => r === systemRole.superadmin)
    ) {
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    return !!user && requiredRoles.includes(user.systemRole);
  }
}
