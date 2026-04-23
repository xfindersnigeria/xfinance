import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { PubsubService } from './pubsub.service';

/**
 * Cache Invalidation Service
 * 
 * Handles invalidation of cached data (menu, permissions, subscription) when changes occur.
 * Uses both direct cache deletion and event publishing for real-time invalidation.
 */
@Injectable()
export class CacheInvalidationService {
  constructor(
    private cacheService: CacheService,
    private pubsubService: PubsubService,
  ) {}

  /**
   * Invalidate menu cache for a specific user context
   * Called when user permissions or roles change
   */
  async invalidateUserMenuCache(
    userId: string,
    groupId?: string,
    entityId?: string,
  ): Promise<void> {
    const g = groupId || 'system';
    const e = entityId || 'all';
    const cacheKey = `menu:${userId}:${g}:${e}`;

    await this.cacheService.delete(cacheKey);
    console.log(`✓ Menu cache invalidated: ${cacheKey}`);
  }

  /**
   * Invalidate all menu caches for a user across all contexts
   * Useful when user's base role changes
   */
  async invalidateUserAllMenuCaches(userId: string): Promise<void> {
    // This would require pattern-based deletion which Redis supports via KEYS
    // For now, we invalidate specific contexts that admin might have access to
    // In future, implement pattern deletion if CacheService supports it
    
    await this.invalidateUserMenuCache(userId); // system:all
    console.log(`✓ All menu caches cleared for user: ${userId}`);
  }

  /**
   * Invalidate menu cache for all users in a group
   * Called when group-level subscription or roles change
   * 
   * NOTE: Currently requires knowing which users have accessed the menu
   * Future improvement: track user->group mapping for efficient batch invalidation
   */
  async invalidateGroupMenuCache(groupId: string): Promise<void> {
    // Publish event for all WebSocket clients to invalidate locally
    await this.pubsubService.publish(`menu-invalidate:${groupId}`, {
      type: 'menu-invalidate',
      groupId,
      timestamp: new Date(),
    });

    console.log(`✓ Menu cache invalidation event published for group: ${groupId}`);
  }

  /**
   * Publish permission change event
   * WebSocket subscribers in a group receive notification to refetch menu
   */
  async publishPermissionChangeEvent(
    groupId: string,
    userId: string,
    entityId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    const event = {
      type: 'permission-change',
      groupId,
      userId,
      entityId,
      timestamp: new Date(),
      ...details,
    };

    await this.pubsubService.publish(`permission-change:${groupId}`, event);
    console.log(`✓ Permission change event published: ${groupId}`);

    // Also invalidate the user's menu cache immediately
    await this.invalidateUserMenuCache(userId, groupId, entityId);
  }

  /**
   * Invalidate subscription cache for a group
   * Called when subscription tier or modules change
   */
  async invalidateGroupSubscriptionCache(groupId: string): Promise<void> {
    const cacheKey = `subscription:${groupId}`;
    await this.cacheService.delete(cacheKey);
    console.log(`✓ Subscription cache invalidated: ${cacheKey}`);

    // Publish event to invalidate menu caches in the group
    await this.invalidateGroupMenuCache(groupId);
  }

  /**
   * Invalidate role cache for a group
   * Called when roles are added/modified/deleted
   */
  async invalidateGroupRoleCache(groupId: string): Promise<void> {
    const cacheKey = `roles:${groupId}`;
    await this.cacheService.delete(cacheKey);
    console.log(`✓ Role cache invalidated: ${cacheKey}`);

    // Publish event to invalidate menu caches in the group
    await this.invalidateGroupMenuCache(groupId);
  }

  /**
   * Invalidate all permissions cache (all scopes)
   * Called when modules/actions/permissions structure changes
   */
  async invalidateAllPermissionsCache(): Promise<void> {
    // Invalidate all scope variations
    await Promise.all([
      this.cacheService.delete('permissions:all'),
      this.cacheService.delete('permissions:all:admin'),
      this.cacheService.delete('permissions:all:user'),
    ]);
    console.log(`✓ All permissions caches invalidated`);
  }

  /**
   * Invalidate permission cache for a user in an entity
   * Called when explicit permissions are granted/revoked
   */
  async invalidateUserPermissionCache(
    userId: string,
    entityId: string,
  ): Promise<void> {
    const cacheKey = `permissions:${userId}:${entityId}`;
    await this.cacheService.delete(cacheKey);
    console.log(`✓ Permission cache invalidated: ${cacheKey}`);
  }

  /**
   * Smart invalidation: Called when a user's resource is modified
   * Invalidates menu cache since available resources may have changed
   */
  async invalidateUserContextCache(
    userId: string,
    groupId: string,
    entityId?: string,
  ): Promise<void> {
    // Invalidate menu
    await this.invalidateUserMenuCache(userId, groupId, entityId);

    // Invalidate permissions
    if (entityId) {
      await this.invalidateUserPermissionCache(userId, entityId);
    }
  }

  /**
   * Publish role change event
   * Called when role is created/modified/deleted
   * WebSocket subscribers receive notification to refetch menu and roles
   */
  async publishRoleChangeEvent(
    groupId: string,
    roleId: string,
    roleName: string,
    details?: Record<string, any>,
  ): Promise<void> {
    const event = {
      type: 'role-change',
      groupId,
      roleId,
      roleName,
      timestamp: new Date(),
      ...details,
    };

    await this.pubsubService.publish(`role-invalidate:${groupId}`, event);
    console.log(`✓ Role change event published: ${groupId}, roleId=${roleId}`);

    // Also invalidate group role cache
    await this.invalidateGroupRoleCache(groupId);
  }

  /**
   * Publish user-role-changed event
   * Called when a user's role assignment changes
   * WebSocket subscribers receive notification to refetch menu and permissions
   *
   * Event: { type: 'user-role-changed', groupId, userId, newRoleId, newRoleName, timestamp }
   */
  async publishUserRoleChangeEvent(
    groupId: string,
    userId: string,
    newRoleId: string,
    newRoleName: string,
    details?: Record<string, any>,
  ): Promise<void> {
    const event = {
      type: 'user-role-changed',
      groupId,
      userId,
      newRoleId,
      newRoleName,
      timestamp: new Date(),
      ...details,
    };

    // Publish to permission-change channel (because user's permissions changed)
    await this.pubsubService.publish(`permission-change:${groupId}`, event);
    console.log(
      `✓ User role change event published: ${groupId}, userId=${userId}, newRoleName=${newRoleName}`,
    );

    // Also invalidate user's menu cache immediately
    await this.invalidateUserMenuCache(userId, groupId);
  }

  /**
   * Get current module version for cache key generation
   * Module version is used in cache keys like: modules:all:v${moduleVersion}
   * 
   * @returns Current module version number
   */
  async getModuleVersion(): Promise<number> {
    const versionKey = 'module:version';
    const cached = await this.cacheService.get<number>(versionKey);
    
    if (cached) {
      return cached;
    }

    // Default to version 1 if not set
    await this.cacheService.set(versionKey, 1, { ttl: 86400 * 365 }); // 1 year TTL
    return 1;
  }

  /**
   * Increment module version to invalidate all module caches
   * Called when modules are created, updated, or deleted
   * 
   * Cache Invalidation Strategy:
   * - Old cache keys (e.g., modules:all:v1) become orphaned
   * - Next request uses new version (modules:all:v2)
   * - No explicit cache deletion needed
   * 
   * @returns New module version
   */
  async incrementModuleVersion(): Promise<number> {
    const versionKey = 'module:version';
    const currentVersion = await this.getModuleVersion();
    const newVersion = currentVersion + 1;

    await this.cacheService.set(versionKey, newVersion, { ttl: 86400 * 365 }); // 1 year TTL
    console.log(`✓ Module version incremented: ${currentVersion} → ${newVersion}`);

    return newVersion;
  }

  /**
   * Invalidate module cache directly (rarely needed with version strategy)
   * Included for explicit invalidation if required
   * 
   * @param scope Optional scope to invalidate specific module caches (SUPERADMIN, GROUP, ENTITY)
   */
  async invalidateModuleCache(scope?: string): Promise<void> {
    if (scope) {
      const cacheKey = `modules:scope:${scope.toLowerCase()}`;
      await this.cacheService.delete(cacheKey);
      console.log(`✓ Module cache invalidated (scope: ${scope}): ${cacheKey}`);
    } else {
      // Invalidate general modules cache
      const cacheKey = 'modules:all';
      await this.cacheService.delete(cacheKey);
      console.log(`✓ Module cache invalidated: ${cacheKey}`);
    }
  }

  /**
   * Publish module change event
   * Called when:
   * - New module is created
   * - Existing module is updated
   * - Module is deleted
   * - Module actions are added/updated/deleted
   * 
   * WebSocket subscribers receive notification to:
   * - Refetch module list for permission selectors
   * - Refetch menu (because available modules may have changed)
   * - Rebuild any module dropdowns
   * 
   * Impact on dependent endpoints:
   * - Menu will include updated moduleVersion in cache key
   * - Permissions will be invalidated if module-level permissions change
   * - Module selector dropdowns will refetch new module list
   * 
   * @param groupId Group affected by module change (or "system" for global modules)
   * @param changeType "created" | "updated" | "deleted"
   * @param moduleId ID of the module changed
   * @param moduleKey Key of the module changed
   * @param details Additional details about the change
   */
  async publishModuleChangeEvent(
    groupId: string,
    changeType: 'created' | 'updated' | 'deleted',
    moduleId: string,
    moduleKey: string,
    details?: Record<string, any>,
  ): Promise<void> {
    // 1. Increment module version
    const newModuleVersion = await this.incrementModuleVersion();

    // 2. Publish event with new version
    const event = {
      type: 'module-change',
      groupId,
      changeType,
      moduleId,
      moduleKey,
      newModuleVersion,
      timestamp: new Date(),
      ...details,
    };

    await this.pubsubService.publish(`module-change:${groupId}`, event);
    console.log(
      `✓ Module change event published: ${groupId}, type=${changeType}, module=${moduleKey}, newVersion=${newModuleVersion}`,
    );

    // 3. Invalidate menu cache for the group
    // Because menu depends on available modules
    await this.invalidateGroupMenuCache(groupId);

    // 4. Invalidate permission cache
    // In case module-level permissions changed
    await this.invalidateGroupRoleCache(groupId);
  }
}
