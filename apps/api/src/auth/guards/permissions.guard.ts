import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { systemRole } from 'prisma/generated/enums';
import { Request } from 'express';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) return false;

    // Allow superAdmin to bypass permission checks
    if (user.systemRole === systemRole.superadmin) return true;
    if (user.systemRole === systemRole.admin) return true;

    // Check if user has all required permissions
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    return requiredPermissions.every((permission) =>
      user.permissions!.includes(permission),
    );
  }
}
