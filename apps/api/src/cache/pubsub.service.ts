import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { CacheService } from '../cache/cache.service';

export interface InvalidationEvent {
  type: 'user' | 'group' | 'permissions' | 'subscription' | 'role' | 'entity' | 'entities';
  userId?: string;
  groupId?: string;
  entityId?: string;
  timestamp: number;
}

@Injectable()
export class PubsubService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private listeners: Map<string, Set<(event: InvalidationEvent) => Promise<void>>> =
    new Map();

  constructor(
    @InjectRedis() private redis: Redis,
    private cacheService: CacheService,
  ) {
    this.subscriber = this.redis.duplicate();
  }

  async onModuleInit() {
    // Set up subscribers for invalidation channels
    this.subscriber.on('message', async (channel, message) => {
      await this.handleMessage(channel, message);
    });

    // Subscribe to relevant channels
    await this.subscriber.subscribe(
      'user:invalidate',
      'group:invalidate',
      'permissions:invalidate',
      'subscription:invalidate',
      'role:invalidate',
      'entity:invalidate',
      'entities:invalidate',
    );
  }

  async onModuleDestroy() {
    await this.subscriber.unsubscribe();
    this.subscriber.disconnect();
  }

  /**
   * Handle incoming pubsub messages
   */
  private async handleMessage(channel: string, message: string) {
    try {
      const event: InvalidationEvent = JSON.parse(message);

      // Invalidate cache based on event type
      switch (event.type) {
        case 'user':
          if (event.userId && event.groupId) {
            await this.cacheService.invalidateUserCache(event.userId, event.groupId);
          }
          break;

        case 'permissions':
          if (event.userId && event.groupId) {
            await this.cacheService.deletePattern(
              CacheService.keys.pattern.userPermissions(event.userId),
            );
            await this.cacheService.deletePattern(
              CacheService.keys.pattern.userMenu(event.userId),
            );
          }
          break;

        case 'subscription':
          if (event.groupId) {
            await this.cacheService.invalidateGroupModuleCache(event.groupId);
          }
          break;

        case 'role':
          if (event.userId && event.groupId) {
            await this.cacheService.invalidateUserCache(event.userId, event.groupId);
          }
          break;

        case 'entity':
          if (event.groupId && event.entityId) {
            await this.cacheService.invalidateEntityCache(event.groupId, event.entityId);
          }
          break;

        case 'entities':
          if (event.groupId) {
            await this.cacheService.invalidateGroupEntities(event.groupId);
          }
          break;

        case 'group':
          if (event.groupId) {
            // Broader invalidation for group-level changes
            await this.cacheService.deletePattern(`*:${event.groupId}:*`);
          }
          break;
      }

      // Trigger registered listeners
      const channelListeners = this.listeners.get(channel);
      if (channelListeners) {
        for (const listener of channelListeners) {
          try {
            await listener(event);
          } catch (err) {
            console.error('Error in pubsub listener:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error handling pubsub message:', error);
    }
  }

  /**
   * Publish user cache invalidation event
   * Called when user permissions, role, or entity access changes
   */
  async invalidateUser(userId: string, groupId: string) {
    const event: InvalidationEvent = {
      type: 'user',
      userId,
      groupId,
      timestamp: Date.now(),
    };

    await this.redis.publish('user:invalidate', JSON.stringify(event));
  }

  /**
   * Publish permission change event
   * Called when admin updates role permissions
   */
  async invalidatePermissions(userId: string, groupId: string) {
    const event: InvalidationEvent = {
      type: 'permissions',
      userId,
      groupId,
      timestamp: Date.now(),
    };

    await this.redis.publish('permissions:invalidate', JSON.stringify(event));
  }

  /**
   * Publish subscription change event
   * Called when admin changes group subscription tier
   */
  async invalidateSubscription(groupId: string) {
    const event: InvalidationEvent = {
      type: 'subscription',
      groupId,
      timestamp: Date.now(),
    };

    await this.redis.publish('subscription:invalidate', JSON.stringify(event));
  }

  /**
   * Publish role change event
   * Called when admin updates a role
   */
  async invalidateRole(groupId: string) {
    const event: InvalidationEvent = {
      type: 'role',
      groupId,
      timestamp: Date.now(),
    };

    await this.redis.publish('role:invalidate', JSON.stringify(event));
  }

  /**
   * Publish group-level change event
   * Called for broad group changes (settings, etc)
   */
  async invalidateGroup(groupId: string) {
    const event: InvalidationEvent = {
      type: 'group',
      groupId,
      timestamp: Date.now(),
    };

    await this.redis.publish('group:invalidate', JSON.stringify(event));
  }

  /**
   * Publish entity change event
   * Called when an entity is updated/deleted
   */
  async invalidateEntity(groupId: string, entityId: string) {
    const event: InvalidationEvent = {
      type: 'entity',
      groupId,
      entityId,
      timestamp: Date.now(),
    };

    await this.redis.publish('entity:invalidate', JSON.stringify(event));
  }

  /**
   * Publish entities change event
   * Called when group entities list changes (add/remove entities)
   */
  async invalidateEntities(groupId: string) {
    const event: InvalidationEvent = {
      type: 'entities',
      groupId,
      timestamp: Date.now(),
    };

    await this.redis.publish('entities:invalidate', JSON.stringify(event));
  }

  /**
   * Generic publish method for custom events
   * Allows publishing to any channel with arbitrary event data
   */
  async publish(channel: string, event: Record<string, any>): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(event));
  }

  /**
   * Register listener for specific invalidation event
   */
  onInvalidation(
    eventType: InvalidationEvent['type'],
    listener: (event: InvalidationEvent) => Promise<void>,
  ): () => void {
    const channel = `${eventType}:invalidate`;
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }

    const listeners = this.listeners.get(channel);
    listeners?.add(listener);

    // Return unsubscribe function
    return () => {
      listeners?.delete(listener);
    };
  }
}
