import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  /**
   * Query audit logs with filters
   * Returns paginated audit log entries
   *
   * Filters:
   * - groupId (required): Limit to group
   * - entityId (optional): Limit to entity
   * - from (optional): Start date (ISO 8601)
   * - to (optional): End date (ISO 8601)
   * - module (optional): Filter by module name
   * - action (optional): Filter by action (Create|Edit|Delete)
   * - userId (optional): Filter by user ID
   * - limit (optional, default: 100): Results per page
   * - offset (optional, default: 0): Pagination offset
   */
  @Get('logs')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Query audit logs',
    description: 'Retrieve audit logs with filters for group, entity, date range, module, and action',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiQuery({ name: 'groupId', required: true, description: 'Group ID' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Entity ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'module', required: false, description: 'Filter by module' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  async getLogs(
    @Query('groupId') groupId?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limitQuery?: string,
    @Query('offset') offsetQuery?: string,
    @Req() req?: Request,
  ) {
    // Validate required groupId
    if (!groupId) {
      throw new BadRequestException('groupId is required');
    }

    // Validate user belongs to this group (from auth guard)
    const authUser = (req as any).user;
    if (authUser.systemRole !== 'superadmin' && authUser.groupId !== groupId) {
      throw new BadRequestException('Unauthorized: You do not have access to this group');
    }

    // Parse limit and offset with defaults
    const limit = Math.min(parseInt(limitQuery || '100'), 500); // Max 500
    const offset = parseInt(offsetQuery || '0');

    if (limit < 1 || offset < 0) {
      throw new BadRequestException('Invalid limit or offset values');
    }

    // Build where clause
    const where: any = {
      groupId,
    };

    if (entityId) {
      where.entityId = entityId;
    }

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    // Handle date range
    if (from || to) {
      where.createdAt = {};

      if (from) {
        try {
          const fromDate = new Date(from);
          if (isNaN(fromDate.getTime())) {
            throw new BadRequestException('Invalid "from" date format. Use ISO 8601 format.');
          }
          where.createdAt.gte = fromDate;
        } catch (e) {
          throw new BadRequestException('Invalid "from" date format. Use ISO 8601 format.');
        }
      }

      if (to) {
        try {
          const toDate = new Date(to);
          if (isNaN(toDate.getTime())) {
            throw new BadRequestException('Invalid "to" date format. Use ISO 8601 format.');
          }
          // Add 1 day to include entire end date
          toDate.setDate(toDate.getDate() + 1);
          where.createdAt.lt = toDate;
        } catch (e) {
          throw new BadRequestException('Invalid "to" date format. Use ISO 8601 format.');
        }
      }
    }

    try {
      // Get total count for pagination
      const total = await this.prisma.auditLog.count({
        where,
      });

      // Get paginated results with user info
      const logs = await this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return {
        data: logs.map((log) => ({
          id: log.id,
          user: log.user ? {
            id: log.user.id,
            name: `${log.user.firstName} ${log.user.lastName}`.trim(),
            email: log.user.email,
          } : null,
          group: {
            id: log.groupId,
          },
          entity: {
            id: log.entityId,
          },
          module: log.module,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          changes: log.changes,
          method: (log as any).method,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      console.error('Error querying audit logs:', error);
      throw new BadRequestException('Failed to query audit logs');
    }
  }

  /**
   * Get audit log statistics
   * Returns count of actions by module, user, etc.
   */
  @Get('stats')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get audit statistics',
    description: 'Returns counts and summaries of audit events',
  })
  @ApiResponse({ status: 200, description: 'Audit statistics' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiQuery({ name: 'groupId', required: true, description: 'Group ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  async getStats(
    @Query('groupId') groupId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: Request,
  ) {
    // Validate required groupId
    if (!groupId) {
      throw new BadRequestException('groupId is required');
    }

    // Validate user belongs to this group
    const authUser = (req as any).user;
    if (authUser.systemRole !== 'superadmin' && authUser.groupId !== groupId) {
      throw new BadRequestException('Unauthorized: You do not have access to this group');
    }

    const where: any = {
      groupId,
    };

    // Handle date range
    if (from || to) {
      where.createdAt = {};

      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          where.createdAt.gte = fromDate;
        }
      }

      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setDate(toDate.getDate() + 1);
          where.createdAt.lt = toDate;
        }
      }
    }

    try {
      // Count by action
      const actionCounts = await this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      });

      // Count by module
      const moduleCounts = await this.prisma.auditLog.groupBy({
        by: ['module'],
        where,
        _count: true,
      });

      // Count by user
      const userCounts = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
      });

      const totalLogs = await this.prisma.auditLog.count({
        where,
      });

      return {
        total: totalLogs,
        byAction: actionCounts.map((ac) => ({
          action: ac.action,
          count: ac._count,
        })),
        byModule: moduleCounts.map((mc) => ({
          module: mc.module,
          count: mc._count,
        })),
        byUser: userCounts.map((uc) => ({
          userId: uc.userId,
          count: uc._count,
        })),
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw new BadRequestException('Failed to get audit statistics');
    }
  }
}
