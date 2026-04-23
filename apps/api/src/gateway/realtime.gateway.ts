import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

/**
 * Real-time WebSocket Gateway for Cache Invalidation Events
 * 
 * Handles:
 * - Permission changes → broadcast to group
 * - Menu invalidation → broadcast to specific users
 * - Subscription changes → broadcast to group
 * - Role changes → broadcast to group
 * 
 * Event Flow:
 * 1. Data change on controller
 * 2. Controller calls CacheInvalidationService
 * 3. CacheInvalidationService publishes event to Redis pubsub
 * 4. This gateway receives event and broadcasts to connected WebSocket clients
 * 5. Frontend receives event and refetches data
 */
@WebSocketGateway({
  namespace: 'cache',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('RealtimeGateway');

  // Track connected clients: userId -> Set<socket.id>
  private userSockets: Map<string, Set<string>> = new Map();

  // Track connected clients: groupId -> Set<socket.id>
  private groupSockets: Map<string, Set<string>> = new Map();

  // Redis subscriber for pubsub
  private subscriber: Redis;

  constructor(@InjectRedis() private redis: Redis) {
    this.subscriber = this.redis.duplicate();
  }

  /**
   * Initialize gateway and set up Redis pubsub listeners
   */
  async afterInit(server: Server) {
    this.logger.log('✓ WebSocket gateway initialized');

    // Subscribe to cache invalidation channels using pattern subscription
    await this.subscriber.psubscribe(
      'permission-change:*',
      'menu-invalidate:*',
      'subscription-invalidate:*',
      'role-invalidate:*',
      'whoami-invalidate:*',
      'customization-invalidate:*',
      (err, count) => {
        if (err) {
          this.logger.error('Failed to subscribe to Redis channels', err);
        } else {
          this.logger.log(`✓ Subscribed to ${count} Redis pubsub patterns`);
        }
      },
    );

    // Handle Redis pattern messages
    this.subscriber.on('pmessage', async (pattern, channel, message) => {
      this.handleRedisMessage(channel, message);
    });
  }

  /**
   * Handle new WebSocket connections
   * Client should send auth token in handshake query
   */
  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    const groupId = this.extractGroupId(client);

    if (!userId || !groupId) {
      this.logger.warn(
        `Connection rejected: missing userId=${userId} or groupId=${groupId}`,
      );
      client.disconnect();
      return;
    }

    // Track user socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    // Track group socket
    if (!this.groupSockets.has(groupId)) {
      this.groupSockets.set(groupId, new Set());
    }
    this.groupSockets.get(groupId)?.add(client.id);

    // Join room for group broadcasts
    client.join(`group:${groupId}`);
    client.join(`user:${userId}`);

    this.logger.log(
      `✓ Client connected: userId=${userId}, groupId=${groupId}, socketId=${client.id}`,
    );
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client);
    const groupId = this.extractGroupId(client);

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    if (groupId) {
      const sockets = this.groupSockets.get(groupId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.groupSockets.delete(groupId);
        }
      }
    }

    this.logger.log(
      `✓ Client disconnected: userId=${userId}, groupId=${groupId}, socketId=${client.id}`,
    );
  }

  /**
   * Handle permission change and user-role-change events from Redis
   * Events: 
   * - { type: 'permission-change', groupId, userId, entityId, timestamp }
   * - { type: 'user-role-changed', groupId, userId, newRoleId, newRoleName, timestamp }
   */
  private handlePermissionChange(event: any) {
    const { groupId, userId, timestamp } = event;

    // Handle user-role-changed event differently
    if (event.type === 'user-role-changed') {
      const { newRoleId, newRoleName } = event;
      this.logger.log(
        `📢 Broadcasting user role change: groupId=${groupId}, userId=${userId}, newRole=${newRoleName}`,
      );

      // Broadcast to specific user whose role changed
      this.server.to(`user:${userId}`).emit('user-role-changed', {
        type: 'user-role-changed',
        groupId,
        userId,
        newRoleId,
        newRoleName,
        timestamp,
        action: 'refetch-menu',
      });

      this.logger.log(
        `✓ Socket emitted to frontend: user:${userId} → user-role-changed`,
      );
      return;
    }

    // Handle regular permission-change event
    const { entityId } = event;
    this.logger.log(
      `📢 Broadcasting permission change: groupId=${groupId}, userId=${userId}`,
    );

    // Broadcast to specific user
    this.server.to(`user:${userId}`).emit('permission-changed', {
      type: 'permission-change',
      userId,
      groupId,
      entityId,
      timestamp,
      action: 'refetch-menu',
    });

    this.logger.log(
      `✓ Socket emitted to frontend: user:${userId} → permission-changed`,
    );
  }

  /**
   * Handle menu invalidation events from Redis
   * Event: { type: 'menu-invalidate', groupId, timestamp }
   */
  private handleMenuInvalidation(event: any) {
    const { groupId, timestamp } = event;

    this.logger.log(`📢 Broadcasting menu invalidation: groupId=${groupId}`);

    // Broadcast to entire group
    this.server.to(`group:${groupId}`).emit('menu-invalidated', {
      type: 'menu-invalidate',
      groupId,
      timestamp,
      action: 'refetch-menu',
    });
    
    this.logger.log(
      `✓ Socket emitted to frontend: group:${groupId} → menu-invalidated`,
    );
  }

  /**
   * Handle subscription change events from Redis
   * Event: { type: 'subscription-change', groupId, timestamp, subscriptionTier, modules }
   */
  private handleSubscriptionChange(event: any) {
    const { groupId, timestamp, subscriptionTier, modules } = event;

    this.logger.log(
      `📢 Broadcasting subscription change: groupId=${groupId}`,
    );

    // Broadcast to entire group
    this.server.to(`group:${groupId}`).emit('subscription-changed', {
      type: 'subscription-change',
      groupId,
      subscriptionTier,
      modules,
      timestamp,
      action: 'refetch-subscription-and-menu',
    });
    
    this.logger.log(
      `✓ Socket emitted to frontend: group:${groupId} → subscription-changed`,
    );
  }

  /**
   * Handle role change events from Redis
   * Event: { type: 'role-change', groupId, timestamp, roleId, roleName }
   */
  private handleRoleChange(event: any) {
    const { groupId, timestamp, roleId, roleName } = event;

    this.logger.log(`📢 Broadcasting role change: groupId=${groupId}`);

    // Broadcast to entire group
    this.server.to(`group:${groupId}`).emit('role-changed', {
      type: 'role-change',
      groupId,
      roleId,
      roleName,
      timestamp,
      action: 'refetch-menu',
    });
    
    this.logger.log(
      `✓ Socket emitted to frontend: group:${groupId} → role-changed`,
    );
  }

  /**
   * Handle whoami/user context invalidation events from Redis
   * Called when entities are created/updated/deleted
   * Event: { type: 'whoami-invalidate', groupId, reason, entityId, timestamp }
   */
  private handleWhoamiInvalidation(event: any) {
    const { groupId, reason, entityId, timestamp } = event;

    this.logger.log(
      `📢 Broadcasting whoami invalidation: groupId=${groupId}, reason=${reason}`,
    );

    // Broadcast to entire group
    this.server.to(`group:${groupId}`).emit('whoami-invalidated', {
      type: 'whoami-invalidate',
      groupId,
      reason,
      entityId,
      timestamp,
      action: 'refetch-whoami',
    });
    
    this.logger.log(
      `✓ Socket emitted to frontend: group:${groupId} → whoami-invalidated`,
    );
  }

  /**
   * Handle incoming messages from Redis pubsub
   * Routes to appropriate handler based on channel
   */
  private handleRedisMessage(channel: string, message: string) {
    try {
      const event = JSON.parse(message);

      if (channel.startsWith('permission-change:')) {
        this.handlePermissionChange(event);
      } else if (channel.startsWith('menu-invalidate:')) {
        this.handleMenuInvalidation(event);
      } else if (channel.startsWith('subscription-invalidate:')) {
        this.handleSubscriptionChange(event);
      } else if (channel.startsWith('role-invalidate:')) {
        this.handleRoleChange(event);
      } else if (channel.startsWith('whoami-invalidate:')) {
        this.handleWhoamiInvalidation(event);
      } else if (channel.startsWith('customization-invalidate:')) {
        this.handleCustomizationChange(event);
      }
    } catch (error) {
      this.logger.error(`Failed to parse Redis message from ${channel}`, error);
    }
  }

  /**
   * Handle customization change events from Redis
   * Broadcasts immediately so all group members see the new theme without refreshing.
   */
  private handleCustomizationChange(event: any) {
    const { groupId, customization, timestamp } = event;
    this.logger.log(`📢 Broadcasting customization change: groupId=${groupId}`);
    this.server.to(`group:${groupId}`).emit('customization-changed', {
      type: 'customization-changed',
      groupId,
      customization,
      timestamp,
    });
    this.logger.log(`✓ Socket emitted to frontend: group:${groupId} → customization-changed`);
  }

  /**
   * Client-initiated ping to keep connection alive
   */
  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  /**
   * Client requests to subscribe to specific group updates
   */
  @SubscribeMessage('subscribe-group')
  handleSubscribeGroup(client: Socket, groupId: string): void {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    client.join(`group:${groupId}`);
    this.logger.log(`✓ Client subscribed to group: ${groupId}`);
    client.emit('subscribed', { groupId });
  }

  /**
   * Client requests to unsubscribe from group updates
   */
  @SubscribeMessage('unsubscribe-group')
  handleUnsubscribeGroup(client: Socket, groupId: string): void {
    client.leave(`group:${groupId}`);
    this.logger.log(`✓ Client unsubscribed from group: ${groupId}`);
    client.emit('unsubscribed', { groupId });
  }

  /**
   * Extract userId from socket handshake
   * Can be in query (token), auth header, or cookie
   */
  private extractUserId(client: Socket): string | null {
    // Try from query
    const query = client.handshake.query as any;
    if (query?.userId) return query.userId;

    // Try from headers (Authorization Bearer token)
    const auth = client.handshake.headers.authorization;
    if (auth) {
      // In real implementation, decode JWT token to get userId
      // For now, stub it out - implement based on your auth strategy
      return null;
    }

    return null;
  }

  /**
   * Extract groupId from socket handshake
   * Usually passed in query or extracted from JWT token
   */
  private extractGroupId(client: Socket): string | null {
    const query = client.handshake.query as any;
    if (query?.groupId) return query.groupId;

    // Could also be extracted from JWT token in Authorization header
    return null;
  }
}
