import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionService } from './permission.service';
import { systemRole } from 'prisma/generated/enums';

@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<{
      module: string;
      action: string;
    }>('requiredPermission', context.getHandler());

    if (!requiredPermission) return true; // No permission required

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request.user as any);

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Bypass for superadmin (can refine later)
    if (user.systemRole === systemRole.superadmin) return true;

    // Get entity ID (may be impersonated)
    // For entity-level operations, entityId is required
    // For admin-level operations, entityId can be null
    let entityId: string | null =
      (request.headers['x-impersonate-entity'] as string) || user.entityId || null;

    // Check permission (entityId can be null for admin operations)
    const hasPermission = await this.permissionService.hasPermission(
      user.id,
      entityId,
      requiredPermission.module,
      requiredPermission.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermission.module}:${requiredPermission.action}`,
      );
    }

    return true;
  }
}
