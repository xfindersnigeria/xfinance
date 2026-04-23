import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { decryptSession } from '../utils/crypto.util';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Get main session (xf cookie)
    const mainToken: string | undefined = req.cookies?.['xf'] as
      | string
      | undefined;
    if (!mainToken) {
      throw new UnauthorizedException();
    }

    const mainPayload = await decryptSession(mainToken);
    if (!mainPayload) {
      throw new UnauthorizedException();
    }

    req.user = mainPayload as Request['user'];

    // Get impersonation headers
    const impersonateGroupHeader =
      (req.headers['x-impersonate-group'] as string) || null;
    const impersonateEntityHeader =
      (req.headers['x-impersonate-entity'] as string) || null;

    // === VALIDATE IMPERSONATION PERMISSIONS ===
    // Only superadmin can impersonate groups
    if (impersonateGroupHeader && mainPayload.systemRole !== 'superadmin') {
      throw new UnauthorizedException(
        'Only superadmin can impersonate groups',
      );
    }

    // Only superadmin and admin can impersonate entities
    if (
      impersonateEntityHeader &&
      mainPayload.systemRole !== 'superadmin' &&
      mainPayload.systemRole !== 'admin'
    ) {
      throw new UnauthorizedException(
        'Only superadmin and admin can impersonate entities',
      );
    }

    // === PROCESS GROUP IMPERSONATION ===
    // Header-based only (legacy cookie fallback removed)
    if (impersonateGroupHeader) {
      (req as any).groupImpersonation = {
        groupId: impersonateGroupHeader,
      };
    }

    // === PROCESS ENTITY IMPERSONATION ===
    // Header-based only (legacy cookie fallback removed)
    if (impersonateEntityHeader) {
      (req as any).entityImpersonation = {
        entityId: impersonateEntityHeader,
      };
    }

    return true;
  }
}
