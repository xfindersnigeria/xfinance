import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PubsubService } from '../cache/pubsub.service';

/**
 * Subscription Expiry Cron Job
 * 
 * Runs daily at 2:00 AM to check for expired subscriptions
 * - Marks them as inactive
 * - Publishes event to notify all connected WebSocket clients
 * - Clients should log out users or show expiry warning
 */
@Injectable()
export class SubscriptionExpiryCronService {
  private readonly logger = new Logger('SubscriptionExpiryCron');

  constructor(
    private prisma: PrismaService,
    private pubsubService: PubsubService,
  ) {}

  /**
   * Check for expired subscriptions and mark them as inactive
   * Runs daily at 2:00 AM
   */
  @Cron('0 2 * * *') // 2:00 AM daily
  async checkAndExpireSubscriptions() {
    try {
      this.logger.log('🔄 Starting subscription expiry check...');

      const now = new Date();

      // Find all active subscriptions that have passed their endDate
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        where: {
          isActive: true,
          endDate: {
            lt: now, // endDate is in the past
          },
        },
        select: {
          id: true,
          groupId: true,
          endDate: true,
          tierName: true,
        },
      });

      if (expiredSubscriptions.length === 0) {
        this.logger.log('✓ No expired subscriptions found');
        return;
      }

      this.logger.warn(
        `⚠️  Found ${expiredSubscriptions.length} expired subscriptions`,
      );

      // Mark all expired subscriptions as inactive
      const result = await this.prisma.subscription.updateMany({
        where: {
          isActive: true,
          endDate: {
            lt: now,
          },
        },
        data: {
          isActive: false,
        },
      });

      this.logger.log(
        `✅ Marked ${result.count} subscriptions as inactive`,
      );

      // Broadcast expiry event to each group
      // Clients will log out users or show warning
      for (const subscription of expiredSubscriptions) {
        try {
          await this.pubsubService.publish(
            `subscription-invalidate:${subscription.groupId}`,
            {
              type: 'subscription-expired',
              groupId: subscription.groupId,
              reason: 'subscription_expired',
              expiredTier: subscription.tierName,
              expiredDate: subscription.endDate,
              timestamp: new Date(),
              action: 'subscription-expired', // Frontend: log out users or show warning
            },
          );

          this.logger.log(
            `📢 Subscription expiry event published for group: ${subscription.groupId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to publish expiry event for group ${subscription.groupId}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Subscription expiry check completed');
    } catch (error) {
      this.logger.error(
        `Error in subscription expiry cron job: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : '',
      );
      // Don't throw - cron jobs should fail gracefully
    }
  }
}
