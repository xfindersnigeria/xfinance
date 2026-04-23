import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = await this.tenantService.resolveTenant(req);

      if (tenantId) {
        (req as any).tenantId = tenantId;
      } else if (this.tenantService.isStandalone()) {
        // Should not reach here — validateStandaloneConfig() blocks startup
        // if DEFAULT_GROUP_ID is missing. Guard defensively anyway.
        throw new UnauthorizedException('Standalone tenant not configured');
      }
      // saas + no subdomain: tenantId stays unset, downstream falls back to JWT groupId

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      next(error);
    }
  }
}
