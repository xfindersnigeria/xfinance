import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

interface AuditContext {
  userId?: string;
  groupId?: string;
  entityId?: string;
  module?: string;
  action?: string;
  impersonatingUserId?: string;
  correlationId?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip audit for GET requests (read-only, no mutations)
    if (request.method === 'GET') {
      return next.handle();
    }

    // Extract audit context from request
    const auditContext = this.extractAuditContext(request);

    // Skip audit for certain endpoints (health checks, public endpoints, etc)
    if (this.shouldSkipAudit(request)) {
      return next.handle();
    }

    // Generate correlation ID for request tracing
    const correlationId = auditContext.correlationId || uuidv4();
    request.correlationId = correlationId;

    const startTime = Date.now();
    const originalBody = request.body;

    return next.handle().pipe(
      tap((responseData) => {
        // Log successful requests (only POST/PUT/PATCH/DELETE)
        this.logAudit(
          {
            ...auditContext,
            correlationId,
          },
          request,
          responseData,
          startTime,
          200,
        ).catch((err) => {
          console.error('Error logging audit:', err);
        });
      }),
      catchError((error) => {
        // Log failed requests (only POST/PUT/PATCH/DELETE)
        this.logAudit(
          {
            ...auditContext,
            correlationId,
          },
          request,
          error,
          startTime,
          error.status || 500,
        ).catch((err) => {
          console.error('Error logging audit error:', err);
        });
        throw error;
      }),
    );
  }

  /**
   * Extract audit context from request
   */
  private extractAuditContext(request: any): AuditContext {
    const user = request.user;
    const headers = request.headers;

    return {
      userId: user?.id,
      groupId: user?.groupId,
      entityId: request.query?.entityId || user?.entityId,
      module: this.extractModuleFromPath(request.path),
      action: this.extractActionFromMethod(request.method, request.path),
      impersonatingUserId: headers['x-impersonate-user'],
      correlationId: headers['x-correlation-id'],
    };
  }

  /**
   * Extract module key from request path
   * Example: /api/invoices -> Invoices
   */
  private extractModuleFromPath(path: string): string | undefined {
    const segments = path.split('/').filter((s) => s);
    // Skip api version prefix
    const apiPath = segments[segments.length - 1];
    if (!apiPath) return undefined;

    // Convert kebab-case to PascalCase and add underscores
    return apiPath
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_');
  }

  /**
   * Extract action from HTTP method and path
   */
  private extractActionFromMethod(method: string, path: string): string {
    if (method === 'GET') return 'View';
    if (method === 'POST') return 'Create';
    if (method === 'PUT' || method === 'PATCH') return 'Edit';
    if (method === 'DELETE') return 'Delete';
    return 'Other';
  }

  /**
   * Determine if request should be audited
   * AUDIT: Everything except GET requests (GET = read-only)
   * INCLUDES: POST (create), PUT/PATCH (update), DELETE (delete)
   * INCLUDES: /api/auth/login, /api/auth/logout, etc.
   */
  private shouldSkipAudit(request: any): boolean {
    const skipPatterns = [
      '/health',
      '/metrics',
      '/docs',
      '/swagger',
    ];

    return skipPatterns.some((pattern) => request.path.includes(pattern));
  }

  /**
   * Log audit entry to database
   * Required: userId, groupId, module
   * Optional: entityId (group-level operations like create group won't have it)
   */
  private async logAudit(
    context: AuditContext,
    request: any,
    response: any,
    startTime: number,
    statusCode: number,
  ): Promise<void> {
    // Only log if we have minimum required info (userId, groupId, module)
    // entityId is optional for group-level operations
    if (!context.userId || !context.groupId || !context.module) {
      return;
    }

    // Calculate changes (for create/update operations)
    let changes: Record<string, any> = {};
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      changes = this.extractChanges(request.body, response);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: context.userId,
          groupId: context.groupId || null,
          entityId: context.entityId || null, // ← Allow null for group-level operations
          module: context.module,
          action: context.action || '',
          method: request.method || '',
          resourceType: 'resource',
          resourceId: this.extractResourceId(request) || '',
          changes: changes,
          ipAddress: this.getClientIp(request),
          userAgent: request.headers['user-agent'] as string,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Extract resource ID from request (from URL or body)
   */
  private extractResourceId(request: any): string | undefined {
    // Try to get from URL params
    const { id } = request.params;
    if (id) return id;

    // Try to get from request body
    if (request.body?.id) return request.body.id;

    return undefined;
  }

  /**
   * Extract changes between request and response
   */
  private extractChanges(
    requestBody: any,
    response: any,
  ): Record<string, any> {
    if (!Array.isArray(response)) {
      return {
        before: {},
        after: requestBody || {},
      };
    }
    return {};
  }

  /**
   * Get client IP from request
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }
}
