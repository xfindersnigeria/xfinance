import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

type DeploymentMode = 'saas' | 'standalone';

@Injectable()
export class TenantService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Startup validation ────────────────────────────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.validateStandaloneConfig();
  }

  /**
   * In standalone mode: verify DEFAULT_GROUP_ID is present in env and exists
   * in the database. Fails fast so misconfiguration is caught before the app
   * accepts any traffic.
   *
   * In saas mode: no-op.
   */
  async validateStandaloneConfig(): Promise<void> {
    if (this.getDeploymentMode() !== 'standalone') return;

    const groupId = process.env.DEFAULT_GROUP_ID;

    if (!groupId) {
      throw new Error(
        '[TenantService] DEPLOYMENT_MODE=standalone requires DEFAULT_GROUP_ID to be set in the environment.',
      );
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });

    if (!group) {
      throw new Error(
        `[TenantService] DEPLOYMENT_MODE=standalone: DEFAULT_GROUP_ID "${groupId}" does not match any group in the database.`,
      );
    }

    this.logger.log(
      `Standalone mode active — tenant locked to group "${group.name}" (${group.id})`,
    );
  }

  // ─── Mode helpers ──────────────────────────────────────────────────────────

  getDeploymentMode(): DeploymentMode {
    const mode = process.env.DEPLOYMENT_MODE;
    return mode === 'standalone' ? 'standalone' : 'saas';
  }

  isStandalone(): boolean {
    return this.getDeploymentMode() === 'standalone';
  }

  // ─── Tenant resolution ─────────────────────────────────────────────────────

  /**
   * Master switch for resolving the active tenant on every inbound request.
   *
   * standalone → returns DEFAULT_GROUP_ID from env (no DB call)
   * saas       → derives group from subdomain and looks it up in the database
   *
   * Returns null when no subdomain is present in saas mode (tenant will be
   * derived downstream from the JWT groupId).
   */
  async resolveTenant(request: Request): Promise<string | null> {
    if (this.isStandalone()) {
      return process.env.DEFAULT_GROUP_ID ?? null;
    }

    return this.resolveFromSubdomain(request);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async resolveFromSubdomain(request: Request): Promise<string | null> {
    const host = request.get('host') ?? '';
    const hostParts = host.split('.');

    if (hostParts.length <= 2) return null;

    const subdomain = hostParts[0];
    if (subdomain === 'api' || subdomain === 'localhost') return null;

    // admin subdomain — super admin context, no tenant needed
    if (subdomain === 'admin') return null;

    const group = await this.prisma.group.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    if (!group) {
      // Log and return null — middleware will surface the error
      this.logger.warn(`No group found for subdomain "${subdomain}"`);
      return null;
    }

    return group.id;
  }
}
