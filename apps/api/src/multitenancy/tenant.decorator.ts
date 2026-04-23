import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    // Priority: 1) subdomain, 2) from impersonation header, 3) from cookie
    if ((request as any).tenantId) return (request as any).tenantId;
    if (request.headers['x-impersonate-group'])
      return request.headers['x-impersonate-group'];
    return (request.user as any)?.groupId;
  },
);

export const EntityId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    // Priority: 1) from impersonation header, 2) from cookie
    if (request.headers['x-impersonate-entity'])
      return request.headers['x-impersonate-entity'];
    return (request.user as any)?.entityId;
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
