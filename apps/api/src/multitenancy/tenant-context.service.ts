import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(@Inject(REQUEST) private request: Request) {}

  getTenantId(): string | undefined {
    return (
      (this.request as any).tenantId ||
      ((this.request.user as any)?.groupId)
    );
  }

  getEntityId(): string | undefined {
    return (this.request.user as any)?.entityId;
  }

  getUserId(): string | undefined {
    return (this.request.user as any)?.id;
  }

  getImpersonationContext(): {
    groupId?: string;
    entityId?: string;
  } {
    return {
      groupId: this.request.headers['x-impersonate-group'] as
        | string
        | undefined,
      entityId: this.request.headers['x-impersonate-entity'] as
        | string
        | undefined,
    };
  }
}
