import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { getEffectiveGroupId } from '../auth/utils/context.util';

@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  /**
   * Query audit logs.
   * groupId is always taken from the auth context — callers cannot spoof it.
   */
  @Get('logs')
  @UseGuards(AuthGuard)
  async getLogs(
    @Req() req: Request,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('page') pageQuery?: string,
    @Query('limit') limitQuery?: string,
  ) {

    console.log("logs", entityId, from, to, module, action, pageQuery, limitQuery)
    const groupId = getEffectiveGroupId(req as any);
    if (!groupId) throw new UnauthorizedException('No group context');

    const limit = Math.min(parseInt(limitQuery || '50'), 200);
    const page = Math.max(parseInt(pageQuery || '1'), 1);
    const skip = (page - 1) * limit;

    const where: any = { groupId };
    if (entityId) where.entityId = entityId;
    if (module) where.module = { contains: module, mode: 'insensitive' };
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) where.createdAt.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 1);
          where.createdAt.lt = d;
        }
      }
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          entity: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        user: log.user
          ? { id: log.user.id, name: `${log.user.firstName ?? ''} ${log.user.lastName ?? ''}`.trim(), email: log.user.email }
          : null,
        entityId: log.entityId,
        entityName: (log as any).entity?.name ?? null,
        module: log.module,
        action: log.action,
        method: log.method,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        changes: log.changes,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        impersonatedGroupId: log.impersonatedGroupId,
        impersonatedEntityId: log.impersonatedEntityId,
        createdAt: log.createdAt,
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /** Distinct module names for the filter dropdown. */
  @Get('modules')
  @UseGuards(AuthGuard)
  async getModules(@Req() req: Request) {
    const groupId = getEffectiveGroupId(req as any);
    if (!groupId) throw new UnauthorizedException('No group context');

    const rows = await this.prisma.auditLog.findMany({
      where: { groupId },
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });
    return { data: rows.map((r) => r.module) };
  }
}
