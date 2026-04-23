import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

const CACHE_TTL = 300; // 5 minutes in seconds

export interface CacheOptions {
  ttl?: number;
}

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private redis: Redis) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // console.log(key, "get key")
      const value = await this.redis.get(key);
      // console.log('RAW REDIS VALUE:', value);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with default 5 min TTL
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      // await this.redis.set('test-key', 'hello', 'EX', 60);
      // console.log(await this.redis.get('test-key'));

      // console.log('TTL:', options?.ttl || CACHE_TTL);
      // await this.redis.setex(key, ttl, JSON.stringify(value));
      // console.log('SETTING CACHE:', key);
      // console.log(JSON.stringify(value))
      const ttl = options?.ttl || CACHE_TTL;
      await this.redis.setex(key, ttl, JSON.stringify(value));
      // console.log(await this.redis.client);
      // console.log('CACHE SET SUCCESS:', key);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Get or set: returns cached value or computes and caches it
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const value = await fn();
      await this.set(key, value, { ttl });
      return value;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error);
      return fn();
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple values by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Delete whoami cache for all users in a group
   * Called when entity is created/updated/deleted to ensure all group members refetch
   * This ensures all users in the group get fresh data when entity changes
   */
  async deleteWhoamiCacheForGroup(groupId: string): Promise<void> {
    try {
      // Pattern: ctx:${groupId}:* matches all user context caches in this group
      const pattern = `ctx:${groupId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(
        `Cache deleteWhoamiCacheForGroup error for groupId ${groupId}:`,
        error,
      );
    }
  }

  /**
   * Publish cache invalidation event
   * Used for real-time synchronization across server instances
   */
  async publishInvalidation(channel: string, key: string): Promise<void> {
    try {
      await this.redis.publish(
        channel,
        JSON.stringify({ key, timestamp: Date.now() }),
      );
    } catch (error) {
      console.error(`Cache publish error for channel ${channel}:`, error);
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribeToInvalidation(
    channel: string,
    callback: (key: string) => Promise<void>,
  ): () => void {
    const subscriber = this.redis.duplicate();

    subscriber.subscribe(channel, (err) => {
      if (err) {
        console.error(`Cache subscribe error for channel ${channel}:`, err);
      }
    });

    subscriber.on('message', async (chan, message) => {
      if (chan === channel) {
        try {
          const { key } = JSON.parse(message);
          await callback(key);
        } catch (error) {
          console.error(`Cache message processing error:`, error);
        }
      }
    });

    // Return unsubscribe function
    return () => {
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }

  /**
   * Cache key builders
   */
  static keys = {
    userMenu: (userId: string, groupId: string, entityId?: string) =>
      `menu:${groupId}:${userId}:${entityId || 'all'}`,
    userPermissions: (userId: string, groupId: string, entityId?: string) =>
      `perms:${groupId}:${userId}:${entityId || 'all'}`,
    userContext: (userId: string, groupId: string, entityId?: string) =>
      `ctx:${groupId}:${userId}:${entityId || 'null'}`,
    entityAvailable: (groupId: string, entityId: string) =>
      `entity:${groupId}:${entityId}`,
    entitiesForUser: (userId: string, groupId: string) =>
      `entities:${groupId}:${userId}`,
    groupEntities: (groupId: string) => `entities:${groupId}:all`,
    subscriptionTier: (groupId: string) => `sub:${groupId}:tier`,
    moduleAvailability: (groupId: string, moduleKey: string) =>
      `mod:${groupId}:${moduleKey}`,
    subscriptionModules: (groupId: string) => `sub:${groupId}:modules`,
    pattern: {
      userMenu: (userId: string) => `menu:*:${userId}:*`,
      userPermissions: (userId: string) => `perms:*:${userId}:*`,
      userContext: (userId: string) => `ctx:*:${userId}:*`,
      userEntities: (userId: string) => `entities:*:${userId}`,
      groupEntities: (groupId: string) => `entity:${groupId}:*`,
      subscriptionTier: (groupId: string) => `sub:${groupId}:*`,
      groupModules: (groupId: string) => `mod:${groupId}:*`,
    },
  };

  /**
   * Invalidate all cached data for a user (when permissions change)
   */
  async invalidateUserCache(userId: string, groupId: string): Promise<void> {
    await Promise.all([
      this.deletePattern(CacheService.keys.pattern.userMenu(userId)),
      this.deletePattern(CacheService.keys.pattern.userPermissions(userId)),
      this.deletePattern(CacheService.keys.pattern.userContext(userId)),
      this.deletePattern(CacheService.keys.pattern.userEntities(userId)),
    ]);

    // Publish invalidation event for real-time sync
    await this.publishInvalidation(
      `user:${groupId}:invalidate`,
      `user:${userId}`,
    );
  }

  /**
   * Invalidate entity data (when entity changes/is deleted)
   */
  async invalidateEntityCache(
    groupId: string,
    entityId: string,
  ): Promise<void> {
    await Promise.all([
      this.delete(CacheService.keys.entityAvailable(groupId, entityId)),
      this.deletePattern(CacheService.keys.pattern.userMenu('*')),
      this.deletePattern(CacheService.keys.pattern.userPermissions('*')),
      this.deletePattern(CacheService.keys.pattern.userContext('*')),
    ]);

    // Publish invalidation event
    await this.publishInvalidation(
      `entity:${groupId}:invalidate`,
      `entity:${entityId}`,
    );
  }

  /**
   * Invalidate group entities list (when entities added/removed/updated)
   */

  async invalidateGroupEntities(groupId: string): Promise<void> {
    await Promise.all([
      this.delete(CacheService.keys.groupEntities(groupId)),
      this.deletePattern(CacheService.keys.pattern.groupEntities(groupId)),
      this.deletePattern(CacheService.keys.pattern.userEntities('*')),
      this.deletePattern(CacheService.keys.pattern.userMenu('*')),
      this.deletePattern(CacheService.keys.pattern.userContext('*')),
    ]);

    // Publish invalidation event
    await this.publishInvalidation(
      `group:${groupId}:entities-invalidate`,
      `entities:${groupId}`,
    );
  }

  /**
   * Invalidate all cached module data for a group (when subscription changes)
   */
  async invalidateGroupModuleCache(groupId: string): Promise<void> {
    await Promise.all([
      this.deletePattern(CacheService.keys.pattern.subscriptionTier(groupId)),
      this.deletePattern(CacheService.keys.pattern.groupModules(groupId)),
      this.deletePattern(CacheService.keys.pattern.userMenu('*')),
      this.deletePattern(CacheService.keys.pattern.userPermissions('*')),
      this.deletePattern(CacheService.keys.pattern.userContext('*')),
    ]);

    // Publish invalidation event for real-time sync
    await this.publishInvalidation(
      `group:${groupId}:invalidate`,
      `modules:${groupId}`,
    );
  }
}
