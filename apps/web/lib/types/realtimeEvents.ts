/**
 * REALTIME EVENTS - Single source of truth for all WebSocket events
 * 
 * When backend adds a new pubsub event:
 * 1. Add event type here with proper TypeScript interface
 * 2. Add handler in websocket.ts (in handleSocketEvent function)
 * That's it! Event will work instantly.
 */

export type RealtimeEventType =
  | 'whoami-invalidated'
  | 'permissions-changed'
  | 'menus-invalidated'
  | 'entity-added'
  | 'entity-removed'
  | 'entity-updated'
  | 'user-role-changed'
  | 'subscription-changed'
  | 'subscription-expired'
  | 'role-changed'
  | 'customization-changed';

export interface RealtimeEventPayload {
  'whoami-invalidated': {
    type: 'whoami-invalidated';
    groupId: string;
    userId: string;
    reason: 'permissions-changed' | 'menus-changed' | 'entities-changed' | 'subscription-changed';
    timestamp: string;
  };

  'permissions-changed': {
    type: 'permissions-changed';
    userId: string;
    groupId: string;
    oldPermissions: Record<string, string[]>;
    newPermissions: Record<string, string[]>;
    changedModules: string[];
    timestamp: string;
  };

  'menus-invalidated': {
    type: 'menus-invalidated';
    groupId: string;
    userId: string;
    reason: 'module-added' | 'module-removed' | 'menu-structure-changed';
    timestamp: string;
  };

  'entity-added': {
    type: 'entity-added';
    groupId: string;
    entityId: string;
    entityName: string;
    timestamp: string;
  };

  'entity-removed': {
    type: 'entity-removed';
    groupId: string;
    entityId: string;
    entityName: string;
    timestamp: string;
  };

  'entity-updated': {
    type: 'entity-updated';
    groupId: string;
    entityId: string;
    previousName: string;
    updatedName: string;
    timestamp: string;
  };

  'user-role-changed': {
    type: 'user-role-changed';
    userId: string;
    groupId: string;
    previousRole: string;
    newRole: string;
    timestamp: string;
  };

  'subscription-changed': {
    type: 'subscription-changed';
    groupId: string;
    subscriptionTier: string;
    modules: string[];
    reason: 'upgrade' | 'downgrade' | 'renewal' | 'cancellation';
    timestamp: string;
  };

  'role-changed': {
    type: 'role-changed';
    groupId: string;
    roleId: string;
    roleName: string;
    action: 'created' | 'updated' | 'deleted';
    timestamp: string;
  };

  'subscription-expired': {
    type: 'subscription-expired';
    groupId: string;
    reason: 'subscription_expired';
    expiredTier: string;
    expiredDate: string;
    timestamp: string;
  };

  'customization-changed': {
    type: 'customization-changed';
    groupId: string;
    customization: {
      primaryColor: string;
      logoUrl: string | null;
      loginBgUrl: string | null;
    };
    timestamp: number;
  };
}

/**
 * Type-safe event getter
 * Usage: const event = getEventPayload('whoami-invalidated', eventData);
 */
export function getEventPayload<T extends RealtimeEventType>(
  type: T,
  data: unknown
): RealtimeEventPayload[T] {
  return data as RealtimeEventPayload[T];
}
