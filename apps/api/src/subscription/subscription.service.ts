import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { PubsubService } from '../cache/pubsub.service';
import { BullmqService } from '@/bullmq/bullmq.service';

import { MenuService } from '../menu/menu.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private pubsubService: PubsubService,
    private bullmqService: BullmqService,
    @Inject(forwardRef(() => MenuService))
    private menuService: MenuService,
  ) {}

  // ============================================
  // PUBLIC: Get Subscription & Packages
  // ============================================

  /**
   * Get all available subscription tiers/packages
   * Cached: 24 hours (rarely changes)
   */
  async getPackages() {
    const cacheKey = 'subscription:packages:all';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const packages = await this.prisma.subscriptionTier.findMany({
      include: {
        subscriptionModules: {
          include: {
            module: {
              select: { id: true, moduleKey: true, displayName: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    await this.cacheService.set(cacheKey, packages, { ttl: 86400 }); // 24h TTL
    return packages;
  }

  /**
   * Get current subscription for a group with usage stats
   * Cached: 5 minutes
   */
  async getCurrentSubscription(groupId: string) {
    console.log(`Fetching subscription for group ${groupId}...`);
    const cacheKey = `sub:${groupId}:tier`;
    const cached = await this.cacheService.get(cacheKey);
    // if (cached) return cached;
    // if (cached) {
    //   return typeof cached === 'string' ? JSON.parse(cached) : cached;
    // }

    // console.log(cached, 'cached');

    const subscription = await this.prisma.subscription.findUnique({
      where: { groupId },
      include: {
        tier: {
          include: {
            subscriptionModules: {
              include: {
                module: {
                  select: { id: true, moduleKey: true, displayName: true },
                },
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            changedBy: {
              select: { email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`No subscription found for group ${groupId}`);
    }

    // Calculate usage vs limits
    const result: any = {
      ...subscription,
      usage: {
        users: subscription.usedUsers,
        maxUsers: subscription.maxUsers,
        usersPercentage: Math.round(
          (subscription.usedUsers / subscription.maxUsers) * 100,
        ),

        entities: subscription.usedEntities,
        maxEntities: subscription.maxEntities,
        entitiesPercentage:
          subscription.maxEntities === 999
            ? 0
            : Math.round(
                (subscription.usedEntities / subscription.maxEntities) * 100,
              ),

        // transactionsMonth: subscription.usedTransactionsMonth,
        // maxTransactionsMonth: subscription.maxTransactionsMonth,
        // transactionsPercentage:
        //   subscription.maxTransactionsMonth === 999999
        //     ? 0
        //     : Math.round(
        //         (subscription.usedTransactionsMonth / subscription.maxTransactionsMonth) * 100,
        //       ),

        // storageGB: subscription.usedStorageGB,
        // maxStorageGB: subscription.maxStorageGB,
        // storagePercentage: Math.round(
        //   (subscription.usedStorageGB / subscription.maxStorageGB) * 100,
        // ),
      },
      allowedModuleIds: subscription.tier.subscriptionModules.map(
        (sm) => sm.moduleId,
      ),
    };

    await this.cacheService.set(cacheKey, result, { ttl: 300 }); // 5min TTL
    return result;
  }

  /**
   * Get active subscription for a group (legacy method for compatibility)
   */
  async getActiveSubscription(groupId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        groupId,
        isActive: true,
      },
      include: {
        tier: {
          include: {
            subscriptionModules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get subscription tier details with all modules
   */
  async getSubscriptionTier(tierId: string) {
    return this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: {
        subscriptionModules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  /**
   * Get all subscription tiers
   */
  async getAllTiers() {
    return this.prisma.subscriptionTier.findMany({
      include: {
        subscriptionModules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  /**
   * Get subscription history for audit trail
   */
  async getHistory(groupId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.subscriptionHistory.findMany({
        where: { groupId },
        include: {
          changedBy: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscriptionHistory.count({ where: { groupId } }),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // MODULE ACCESS CHECKS
  // ============================================

  /**
   * In standalone mode all modules are unlocked — no subscription record is
   * required.  The modules table must be seeded via seed-modules.ts before
   * the app is used in standalone (see CLAUDE.md standalone checklist).
   */
  private isStandalone(): boolean {
    return process.env.DEPLOYMENT_MODE === 'standalone';
  }

  /**
   * Check if a group has access to a specific module
   */
  async hasModuleAccess(groupId: string, moduleKey: string): Promise<boolean> {
    if (this.isStandalone()) return true;

    const subscription = await this.getActiveSubscription(groupId);

    if (!subscription) {
      return false;
    }

    const hasModule = subscription.tier.subscriptionModules.some(
      (sm) => sm.module.moduleKey === moduleKey,
    );

    return hasModule;
  }

  /**
   * Get all available modules for a group based on active subscription.
   * In standalone mode returns every module row so menus are fully unlocked.
   */
  async getAvailableModules(groupId: string) {
    if (this.isStandalone()) {
      return this.prisma.module.findMany();
    }

    const subscription = await this.getActiveSubscription(groupId);

    if (!subscription) {
      return [];
    }

    return subscription.tier.subscriptionModules.map((sm) => sm.module);
  }

  /**
   * Get all available ENTITY-scope modules for a group
   */
  async getAvailableEntityModules(groupId: string) {
    const modules = await this.getAvailableModules(groupId);
    return modules.filter((m) => m.scope === 'ENTITY');
  }

  /**
   * Get all available GROUP-scope (admin) modules for a group
   */
  async getAvailableGroupModules(groupId: string) {
    const modules = await this.getAvailableModules(groupId);
    return modules.filter((m) => m.scope === 'GROUP');
  }

  /**
   * Check if module should be visible in menu
   */
  async isModuleVisibleInMenu(
    groupId: string,
    moduleKey: string,
  ): Promise<boolean> {
    return this.hasModuleAccess(groupId, moduleKey);
  }

  /**
   * Get allowed module IDs for subscription
   */
  async getAllowedModuleIds(groupId: string): Promise<string[]> {
    const sub = await this.getCurrentSubscription(groupId);
    return sub.allowedModuleIds;
  }

  // ============================================
  // UPDATE SUBSCRIPTION
  // ============================================

  /**
   * Update subscription tier (upgrade/downgrade)
   * Clears caches and publishes pubsub event for real-time updates
   */
  async updateSubscription(groupId: string, newTierId: string, userId: string) {
    // Validate group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');

    // Get new tier
    const newTier = await this.prisma.subscriptionTier.findUnique({
      where: { id: newTierId },
      include: {
        subscriptionModules: {
          include: { module: { select: { id: true, moduleKey: true } } },
        },
      },
    });
    if (!newTier) throw new NotFoundException('Subscription tier not found');

    // Get current subscription
    const currentSub = await this.prisma.subscription.findUnique({
      where: { groupId },
    });

    const previousTierId = currentSub?.subscriptionTierId;

    // If subscription exists, update it
    if (currentSub) {
      const baseBillingDate = currentSub.billingEndDate ?? new Date();
      const newBillingEndDate = new Date(
        baseBillingDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      const updated = await this.prisma.subscription.update({
        where: { groupId },
        data: {
          subscriptionTierId: newTierId,
          tierName: newTier.name,
          maxUsers: (newTier.maxUsers ?? -1) as number,
          maxEntities: (newTier.maxEntities ?? -1) as number,
          // maxTransactionsMonth: (newTier.maxTransactionsMonth ?? -1) as number,
          // maxStorageGB: (newTier.maxStorageGB ?? -1) as number,
          // maxApiRatePerHour: (newTier.maxApiRatePerHour ?? -1) as number,
          billingEndDate: newBillingEndDate,
          renewalDate: newBillingEndDate,
        },
      });

      // Create history audit
      const previousTier = previousTierId
        ? await this.prisma.subscriptionTier.findUnique({
            where: { id: previousTierId },
          })
        : null;

      await this.prisma.subscriptionHistory.create({
        data: {
          groupId,
          previousTierId,
          previousTierName: previousTier?.name || null,
          newTierId,
          newTierName: newTier.name,
          changeReason: previousTierId ? 'upgrade' : 'initial_subscription',
          changedByUserId: userId,
          effectiveDate: new Date(),
        },
      });

      // 🔥 Cache Invalidation
      await this.invalidateSubscriptionCache(
        groupId,
        newTier.subscriptionModules.map((sm) => sm.moduleId),
      );

      return updated;
    }

    // If no subscription exists, create one
    const created = await this.prisma.subscription.create({
      data: {
        groupId,
        subscriptionTierId: newTierId,
        tierName: newTier.name,
        maxUsers: (newTier.maxUsers ?? -1) as number,
        maxEntities: (newTier.maxEntities ?? -1) as number,
        // maxTransactionsMonth: (newTier.maxTransactionsMonth ?? -1) as number,
        // maxStorageGB: (newTier.maxStorageGB ?? -1) as number,
        // maxApiRatePerHour: (newTier.maxApiRatePerHour ?? -1) as number,
        billingStartDate: new Date(),
        billingEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create initial history
    await this.prisma.subscriptionHistory.create({
      data: {
        groupId,
        previousTierId: null,
        previousTierName: null,
        newTierId,
        newTierName: newTier.name,
        changeReason: 'initial_subscription',
        changedByUserId: userId,
        effectiveDate: new Date(),
      },
    });

    // 🔥 Cache Invalidation
    await this.invalidateSubscriptionCache(
      groupId,
      newTier.subscriptionModules.map((sm) => sm.moduleId),
    );
    await this.cacheService.delete('subscription:superadmin:stats');

    return created;
  }

  /**
   * Create or update group subscription to a tier (legacy method)
   */
  async subscribeToTier(groupId: string, tierId: string) {
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      throw new Error(`Subscription tier ${tierId} not found`);
    }

    await this.prisma.subscription.updateMany({
      where: { groupId },
      data: { isActive: false },
    });

    return this.prisma.subscription.create({
      data: {
        groupId,
        subscriptionTierId: tierId,
        tierName: tier.name,
        maxUsers: (tier.maxUsers ?? -1) as number,
        maxEntities: (tier.maxEntities ?? -1) as number,
        // maxTransactionsMonth: (tier.maxTransactionsMonth ?? -1) as number,
        // maxStorageGB: (tier.maxStorageGB ?? -1) as number,
        // maxApiRatePerHour: (tier.maxApiRatePerHour ?? -1) as number,
        isActive: true,
      },
      include: {
        tier: {
          include: {
            subscriptionModules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Upgrade subscription to a different tier
   */
  async upgradeTier(groupId: string, newTierId: string) {
    return this.subscribeToTier(groupId, newTierId);
  }

  /**
   * Cancel active subscription for a group
   */
  async cancelSubscription(groupId: string) {
    return this.prisma.subscription.updateMany({
      where: {
        groupId,
        isActive: true,
      },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
  }

  /**
   * Renew subscription (extend endDate)
   */
  async renewSubscription(groupId: string, newEndDate: Date) {
    return this.prisma.subscription.updateMany({
      where: {
        groupId,
        isActive: true,
      },
      data: {
        endDate: newEndDate,
      },
    });
  }

  // ============================================
  // USAGE LIMITS CHECKING
  // ============================================

  /**
   * Check if user can create a new user based on subscription limit
   */
  async checkUserLimit(groupId: string, newUserCount = 1) {
    if (this.isStandalone()) return { allowed: true };

    try {
      const sub: any = await this.getCurrentSubscription(groupId);
      if (sub.usage.users + newUserCount > sub.usage.maxUsers) {
        // console.log(sub.usage.maxUsers, sub.usage.users, newUserCount)
        return {
          allowed: false,
          message: `User limit (${sub.usage.maxUsers}) reached for ${sub.tierName} plan. Upgrade to add more users.`,
        };
      }
      return { allowed: true };
    } catch (error) {
      // If no subscription found, don't allow creating users
      return {
        allowed: false,
        message:
          'No active subscription found. Please subscribe to a plan to create users.',
      };
    }
  }

  /**
   * Check if entity can be created based on subscription limit
   */
  async checkEntityLimit(groupId: string, newEntityCount = 1) {
    if (this.isStandalone()) return { allowed: true };

    try {
      const sub: any = await this.getCurrentSubscription(groupId);
      if (sub.usage.entities + newEntityCount > sub.usage.maxEntities) {
        return {
          allowed: false,
          message: `Entity limit (${sub.usage.maxEntities}) reached for ${sub.tierName} plan.`,
        };
      }
      return { allowed: true };
    } catch (error) {
      // If no subscription found, don't allow creating entities
      return {
        allowed: false,
        message:
          'No active subscription found. Please subscribe to a plan to create entities.',
      };
    }
  }

  /**
   * Check if transaction limit exceeded for current month
   */
  async checkTransactionLimit(groupId: string, newTransactions = 1) {
    if (this.isStandalone()) return { allowed: true };

    try {
      const sub: any = await this.getCurrentSubscription(groupId);
      if (
        sub.usage.transactionsMonth + newTransactions >
        sub.usage.maxTransactionsMonth
      ) {
        return {
          allowed: false,
          message: `Monthly transaction limit (${sub.usage.maxTransactionsMonth}) reached for ${sub.tierName} plan.`,
        };
      }
      return { allowed: true };
    } catch (error) {
      // If no subscription found, don't allow transactions
      return {
        allowed: false,
        message: 'No active subscription found. Please subscribe to a plan.',
      };
    }
  }

  /**
   * Check if storage limit exceeded
   */
  async checkStorageLimit(groupId: string, additionalStorageGB = 1) {
    if (this.isStandalone()) return { allowed: true };

    try {
      const sub: any = await this.getCurrentSubscription(groupId);
      if (sub.usage.storageGB + additionalStorageGB > sub.usage.maxStorageGB) {
        return {
          allowed: false,
          message: `Storage limit (${sub.usage.maxStorageGB}GB) reached for ${sub.tierName} plan.`,
        };
      }
      return { allowed: true };
    } catch (error) {
      // If no subscription found, don't allow storage
      return {
        allowed: false,
        message: 'No active subscription found. Please subscribe to a plan.',
      };
    }
  }

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Increment user count for subscription
   */
  async incrementUserCount(groupId: string, count = 1) {
    await this.prisma.subscription.update({
      where: { groupId },
      data: { usedUsers: { increment: count } },
    });
    await this.cacheService.delete(`sub:${groupId}:tier`);
  }

  /**
   * Decrement user count for subscription
   */
  async decrementUserCount(groupId: string, count = 1) {
    await this.prisma.subscription.update({
      where: { groupId },
      data: { usedUsers: { decrement: count } },
    });
    await this.cacheService.delete(`sub:${groupId}:tier`);
  }

  /**
   * Increment entity count for subscription
   */
  async incrementEntityCount(groupId: string, count = 1) {
    await this.prisma.subscription.update({
      where: { groupId },
      data: { usedEntities: { increment: count } },
    });
    await this.cacheService.delete(`sub:${groupId}:tier`);
  }

  /**
   * Decrement entity count
   */
  async decrementEntityCount(groupId: string, count = 1) {
    await this.prisma.subscription.update({
      where: { groupId },
      data: { usedEntities: { decrement: count } },
    });
    await this.cacheService.delete(`sub:${groupId}:tier`);
  }

  /**
   * Increment transaction count (monthly, auto-resets)
   */
  async incrementTransactionCount(groupId: string, count = 1) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sub = await this.prisma.subscription.findUnique({
      where: { groupId },
    });

    if (!sub) {
      throw new NotFoundException(
        `Subscription not found for group ${groupId}`,
      );
    }

    if (sub.billingStartDate < monthStart) {
      // New month, reset counter
      await this.prisma.subscription.update({
        where: { groupId },
        data: {
          usedTransactionsMonth: count,
          billingStartDate: monthStart,
          billingEndDate: new Date(
            monthStart.getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
        },
      });
    } else {
      // Same month, increment
      await this.prisma.subscription.update({
        where: { groupId },
        data: { usedTransactionsMonth: { increment: count } },
      });
    }

    await this.cacheService.delete(`sub:${groupId}:tier`);
  }

  /**
   * Increment storage usage
   */
  async incrementStorageUsage(groupId: string, additionalGB: number) {
    await this.prisma.subscription.update({
      where: { groupId },
      data: { usedStorageGB: { increment: additionalGB } },
    });
    await this.cacheService.delete(`sub:${groupId}:tier`);
  }

  // ============================================
  // PRIVATE: CACHE INVALIDATION
  // ============================================

  /**
   * 🔥 CRITICAL: Invalidate all caches when subscription changes
   * Ensures all users see menu updates immediately via WebSocket
   */
  private async invalidateSubscriptionCache(
    groupId: string,
    allowedModuleIds: string[] = [],
  ) {
    try {
      // 1. Clear subscription cache
      await this.cacheService.delete(`sub:${groupId}:tier`);

      // 2. Clear all whoami caches (menu depends on subscription modules)
      await this.cacheService.deleteWhoamiCacheForGroup(groupId);

      // 3. Clear all context caches
      await this.cacheService.deletePattern(`ctx:${groupId}:*`);

      // 4. Clear all menu caches (pattern: menu:{userId}:{groupId}:*)
      await this.cacheService.deletePattern(`menu:*:${groupId}:*`);

      // 5. Get all users in the group and invalidate their personal caches
      const groupUsers = await this.prisma.user.findMany({
        where: { groupId },
        select: { id: true },
      });

      // Invalidate cache for each user
      await Promise.all(
        groupUsers.map(async (user) => {
          try {
            // Invalidate user-specific caches (permissions, context, menu)
            await this.cacheService.invalidateUserCache(user.id, groupId);
            // Invalidate menu for this user in this group
            await this.menuService.invalidateGroupMenuCache(user.id, groupId);
          } catch (err) {
            // Log but don't fail - continue invalidating other users
            console.warn(
              `⚠️ Failed to invalidate cache for user ${user.id}: ${err}`,
            );
          }
        }),
      );

      // 6. Publish pubsub event for real-time updates to all users
      await this.pubsubService.publish(`subscription-invalidate:${groupId}`, {
        type: 'subscription-change',
        groupId,
        subscriptionTier: 'updated',
        modules: allowedModuleIds,
        timestamp: new Date(),
      });

      console.log(
        `✅ Invalidated subscription cache for group ${groupId} (${groupUsers.length} users)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Error invalidating subscription cache: ${errorMessage}`,
      );
      // Don't throw - subscription was still updated successfully
    }
  }

  // ============================================
  // SUBSCRIPTION TIER CRUD
  // ============================================

  /**
   * Get a single subscription tier by ID
   */
  async getTierById(tierId: string) {
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: {
        subscriptionModules: {
          include: {
            module: {
              select: { id: true, moduleKey: true, displayName: true },
            },
          },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    return tier;
  }

  /**
   * Create a new subscription tier with optional modules
   * If moduleIds provided, queues BullMQ job to assign them
   */
  async createSubscriptionTier(createSubscriptionTierDto: any) {
    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      maxUsers,
      maxEntities,
      // maxTransactionsMonth,
      // maxStorageGB,
      // maxApiRatePerHour,
      // apiAccess = false,
      // webhooks = false,
      // sso = false,
      customBranding = false,
      prioritySupport = false,
      moduleIds,
    } = createSubscriptionTierDto;

    // Check if tier already exists
    const existingTier = await this.prisma.subscriptionTier.findFirst({
      where: { name },
    });

    if (existingTier) {
      throw new Error(`Subscription tier with name "${name}" already exists`);
    }

    const tier = await this.prisma.subscriptionTier.create({
      data: {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        maxUsers,
        maxEntities,
        customBranding,
        prioritySupport,
      } as any,
      include: {
        subscriptionModules: {
          include: { module: true },
        },
      },
    });

    // Queue module assignment job if moduleIds provided
    // let jobInfo: any = null;
    if (moduleIds && moduleIds.length > 0) {
      await this.bullmqService.addJob('assign-tier-modules', {
        tierId: tier.id,
        moduleIds,
        clearExisting: false,
      });
      // jobInfo = {
      //   jobId: (job as any).id,
      //   status: 'queued',
      // };
      // console.log(`📋 Queued module assignment job ${(job as any).id} for tier ${name}`);
    }

    console.log(`✅ Subscription tier created: ${name}`);
    return {
      ...tier,
      // moduleAssignmentJob: jobInfo,
    };
  }

  /**
   * Update an existing subscription tier with optional module reassignment
   * If moduleIds provided, queues BullMQ job to replace all tier modules
   */
  async updateSubscriptionTier(tierId: string, updateSubscriptionTierDto: any) {
    // Check if tier exists
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: {
        subscriptionModules: {
          include: { module: true },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    // Extract moduleIds before spreading
    const { moduleIds, ...updateDtoRest } = updateSubscriptionTierDto;

    // Prepare update data
    const updateData: any = {};
    if (updateDtoRest.name !== undefined) {
      updateData.name = updateDtoRest.name;
    }
    if (updateDtoRest.description !== undefined) {
      updateData.description = updateDtoRest.description;
    }
    if (updateDtoRest.monthlyPrice !== undefined) {
      updateData.monthlyPrice = updateDtoRest.monthlyPrice;
    }
    if (updateDtoRest.yearlyPrice !== undefined) {
      updateData.yearlyPrice = updateDtoRest.yearlyPrice;
    }
    if (updateDtoRest.maxUsers !== undefined) {
      updateData.maxUsers = updateDtoRest.maxUsers;
    }
    if (updateDtoRest.maxEntities !== undefined) {
      updateData.maxEntities = updateDtoRest.maxEntities;
    }
    // if (updateDtoRest.maxTransactionsMonth !== undefined) {
    //   updateData.maxTransactionsMonth = updateDtoRest.maxTransactionsMonth;
    // }
    // if (updateDtoRest.maxStorageGB !== undefined) {
    //   updateData.maxStorageGB = updateDtoRest.maxStorageGB;
    // }
    // if (updateDtoRest.maxApiRatePerHour !== undefined) {
    //   updateData.maxApiRatePerHour = updateDtoRest.maxApiRatePerHour;
    // }
    // if (updateDtoRest.apiAccess !== undefined) {
    //   updateData.apiAccess = updateDtoRest.apiAccess;
    // }
    // if (updateDtoRest.webhooks !== undefined) {
    //   updateData.webhooks = updateDtoRest.webhooks;
    // }
    // if (updateDtoRest.sso !== undefined) {
    //   updateData.sso = updateDtoRest.sso;
    // }
    if (updateDtoRest.customBranding !== undefined) {
      updateData.customBranding = updateDtoRest.customBranding;
    }
    if (updateDtoRest.prioritySupport !== undefined) {
      updateData.prioritySupport = updateDtoRest.prioritySupport;
    }

    const updatedTier = await this.prisma.subscriptionTier.update({
      where: { id: tierId },
      data: updateData,
      include: {
        subscriptionModules: {
          include: { module: true },
        },
      },
    });

    // Handle module reassignment if moduleIds provided
    // let jobInfo: any = null;
    if (moduleIds !== undefined) {
      // Queue module assignment job
      await this.bullmqService.addJob('assign-tier-modules', {
        tierId,
        moduleIds: moduleIds || [],
        clearExisting: true,
      });
      // jobInfo = {
      //   jobId: job.id,
      //   status: 'queued',
      // };
      // console.log(`📋 Queued module reassignment job ${job.id} for tier ${updatedTier.name}`);
    }

    // Invalidate tier cache and dashboard stats
    // await this.cacheService.delete('subscription:packages:all');
    // await this.cacheService.delete('subscription:superadmin:stats');

    console.log(`✅ Subscription tier updated: ${updatedTier.name}`);
    return {
      ...updatedTier,
      // moduleAssignmentJob: jobInfo,
    };
  }

  /**
   * Delete a subscription tier
   * Cannot delete if it has active subscriptions
   */
  async deleteSubscriptionTier(tierId: string) {
    // Check if tier exists
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: { subscriptions: true },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    // Check if tier has active subscriptions
    const activeSubscriptions = tier.subscriptions.filter(
      (sub: any) => sub.isActive,
    );
    if (activeSubscriptions.length > 0) {
      throw new Error(
        `Cannot delete tier "${tier.name}" - it has ${activeSubscriptions.length} active subscriptions`,
      );
    }

    const deletedTier = await this.prisma.subscriptionTier.delete({
      where: { id: tierId },
    });

    // Invalidate tier cache and dashboard stats
    await this.cacheService.delete('subscription:packages:all');
    await this.cacheService.delete('subscription:superadmin:stats');

    console.log(`✅ Subscription tier deleted: ${deletedTier.name}`);
    return {
      ...deletedTier,
      message: 'Subscription tier deleted successfully',
    };
  }

  // ============================================
  // SUBSCRIPTION CRUD
  // ============================================

  /**
   * Get subscription for a specific group
   */
  async getSubscriptionByGroupId(groupId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { groupId },
      include: {
        tier: {
          include: {
            subscriptionModules: {
              include: {
                module: {
                  select: { id: true, moduleKey: true, displayName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription not found for group "${groupId}"`,
      );
    }

    return subscription;
  }

  /**
   * Create a subscription for a group
   */
  async createSubscription(groupId: string, createSubscriptionDto: any) {
    const { subscriptionTierId, reason } = createSubscriptionDto;

    // Check if group has subscription already
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { groupId },
    });

    if (existingSubscription) {
      throw new Error(
        `Group "${groupId}" already has a subscription. Use PATCH to update.`,
      );
    }

    // Check if tier exists
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: subscriptionTierId },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${subscriptionTierId}" not found`,
      );
    }

    // Create subscription
    const now = new Date();
    const subscription = await this.prisma.subscription.create({
      data: {
        groupId,
        subscriptionTierId,
        tierName: tier.name,
        maxUsers: (tier.maxUsers ?? -1) as number,
        maxEntities: (tier.maxEntities ?? -1) as number,
        // maxTransactionsMonth: (tier.maxTransactionsMonth ?? -1) as number,
        // maxStorageGB: (tier.maxStorageGB ?? -1) as number,
        // maxApiRatePerHour: (tier.maxApiRatePerHour ?? -1) as number,
        startDate: now,
        billingStartDate: now,
        billingEndDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
      },
    });

    // Create history entry
    await this.prisma.subscriptionHistory.create({
      data: {
        groupId,
        newTierId: subscriptionTierId,
        newTierName: tier.name,
        changeReason: 'initial_subscription',
        effectiveDate: now,
      },
    });

    // Invalidate cache
    await this.cacheService.delete(`sub:${groupId}:tier`);
    await this.cacheService.delete('subscription:superadmin:stats');

    console.log(`✅ Subscription created for group ${groupId}: ${tier.name}`);
    return subscription;
  }

  /**
   * Update a group's subscription
   */
  async updateSubscriptionForGroup(
    groupId: string,
    updateSubscriptionDto: any,
  ) {
    const { subscriptionTierId, isActive, reason } = updateSubscriptionDto;

    // Check if subscription exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { groupId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription not found for group "${groupId}"`,
      );
    }

    const updateData: any = {};

    // If changing tier, verify it exists
    if (subscriptionTierId) {
      const newTier = await this.prisma.subscriptionTier.findUnique({
        where: { id: subscriptionTierId },
      });

      if (!newTier) {
        throw new NotFoundException(
          `Subscription tier with ID "${subscriptionTierId}" not found`,
        );
      }

      updateData.subscriptionTierId = subscriptionTierId;
      updateData.tierName = newTier.name;
      updateData.maxUsers = newTier.maxUsers;
      updateData.maxEntities = newTier.maxEntities;
      updateData.maxTransactionsMonth = newTier.maxTransactionsMonth;
      updateData.maxStorageGB = newTier.maxStorageGB;
      updateData.maxApiRatePerHour = newTier.maxApiRatePerHour;

      // Create history entry for tier change
      await this.prisma.subscriptionHistory.create({
        data: {
          groupId,
          previousTierId: subscription.subscriptionTierId,
          previousTierName: subscription.tierName,
          newTierId: subscriptionTierId,
          newTierName: newTier.name,
          changeReason: reason === 'downgrade' ? 'downgrade' : 'upgrade',
          effectiveDate: new Date(),
        },
      });
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { groupId },
      data: updateData,
    });

    // Invalidate cache
    await this.invalidateSubscriptionCache(groupId);
    await this.cacheService.delete('subscription:superadmin:stats');

    console.log(`✅ Subscription updated for group ${groupId}`);
    return updatedSubscription;
  }

  /**
   * Delete a subscription for a group
   */
  async deleteSubscription(groupId: string) {
    // Check if subscription exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { groupId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription not found for group "${groupId}"`,
      );
    }

    const deletedSubscription = await this.prisma.subscription.delete({
      where: { groupId },
    });

    // Invalidate cache
    await this.cacheService.delete(`sub:${groupId}:tier`);
    await this.cacheService.deleteWhoamiCacheForGroup(groupId);
    await this.cacheService.delete('subscription:superadmin:stats');

    console.log(`✅ Subscription deleted for group ${groupId}`);
    return {
      ...deletedSubscription,
      message: 'Subscription deleted successfully',
    };
  }

  // ============================================
  // SUBSCRIPTION TIER MODULES MANAGEMENT
  // ============================================

  /**
   * Get all modules assigned to a subscription tier
   */
  async getSubscriptionTierModules(tierId: string) {
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: {
        subscriptionModules: {
          include: {
            module: {
              select: {
                id: true,
                moduleKey: true,
                displayName: true,
                description: true,
                scope: true,
                menu: true,
              },
            },
          },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    return tier.subscriptionModules.map((sm) => ({
      id: sm.id,
      moduleId: sm.moduleId,
      module: sm.module,
      addedAt: sm.createdAt,
    }));
  }

  /**
   * Add a module to a subscription tier
   * One module can only be added once per tier
   */
  async addModuleToSubscriptionTier(tierId: string, moduleId: string) {
    // Verify tier exists
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    // Verify module exists
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${moduleId}" not found`);
    }

    // Check if module already assigned to tier
    const existingAssignment = await this.prisma.subscriptionModule.findFirst({
      where: { subscriptionTierId: tierId, moduleId },
    });

    if (existingAssignment) {
      throw new Error(
        `Module "${module.displayName}" is already assigned to tier "${tier.name}"`,
      );
    }

    // Add module to tier
    const assignment = await this.prisma.subscriptionModule.create({
      data: {
        subscriptionTierId: tierId,
        moduleId,
      },
      include: {
        module: {
          select: {
            id: true,
            moduleKey: true,
            displayName: true,
            description: true,
            scope: true,
            menu: true,
          },
        },
      },
    });

    // Invalidate tier cache
    await this.cacheService.delete('subscription:packages:all');

    console.log(
      `✅ Module "${module.displayName}" added to tier "${tier.name}"`,
    );
    return {
      id: assignment.id,
      moduleId: assignment.moduleId,
      module: assignment.module,
      addedAt: assignment.createdAt,
    };
  }

  /**
   * Remove a module from a subscription tier
   */
  async removeModuleFromSubscriptionTier(tierId: string, moduleId: string) {
    // Verify tier exists
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    // Find the assignment
    const assignment = await this.prisma.subscriptionModule.findFirst({
      where: { subscriptionTierId: tierId, moduleId },
      include: {
        module: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Module with ID "${moduleId}" is not assigned to tier with ID "${tierId}"`,
      );
    }

    // Delete the assignment
    await this.prisma.subscriptionModule.delete({
      where: { id: assignment.id },
    });

    // Invalidate tier cache
    await this.cacheService.delete('subscription:packages:all');

    console.log(
      `✅ Module "${assignment.module.displayName}" removed from tier "${tier.name}"`,
    );
    return { message: 'Module successfully removed from subscription tier' };
  }

  /**
   * Replace all modules for a subscription tier
   * Useful for bulk updates
   */
  async updateSubscriptionTierModules(tierId: string, moduleIds: string[]) {
    // Verify tier exists
    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      throw new NotFoundException(
        `Subscription tier with ID "${tierId}" not found`,
      );
    }

    // Verify all modules exist
    const modules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds } },
    });

    if (modules.length !== moduleIds.length) {
      throw new NotFoundException(
        `Some modules do not exist. Expected ${moduleIds.length} modules, found ${modules.length}`,
      );
    }

    // Delete existing assignments for this tier
    await this.prisma.subscriptionModule.deleteMany({
      where: { subscriptionTierId: tierId },
    });

    // Create new assignments
    const newAssignments = await this.prisma.subscriptionModule.createMany({
      data: moduleIds.map((moduleId) => ({
        subscriptionTierId: tierId,
        moduleId,
      })),
    });

    // Fetch updated assignments
    const updatedAssignments = await this.getSubscriptionTierModules(tierId);

    // Invalidate tier cache
    await this.cacheService.delete('subscription:packages:all');

    console.log(
      `✅ Updated ${newAssignments.count} modules for tier "${tier.name}"`,
    );
    return updatedAssignments;
  }

  // ============================================
  // SUPERADMIN DASHBOARD STATS
  // ============================================

  /**
   * Get subscription dashboard stats for superadmin
   * Returns: MRR, active subscriptions, trial conversions, avg revenue per customer
   * Cached for 1 hour (rarely changes intra-hour)
   */
  async getSuperadminDashboardStats() {
    const cacheKey = 'subscription:superadmin:stats';

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // 1. Get all active subscriptions with tier pricing
      const activeSubscriptions = await this.prisma.subscription.findMany({
        where: { isActive: true },
        include: {
          tier: {
            select: {
              monthlyPrice: true,
              yearlyPrice: true,
            },
          },
        },
      });

      const totalActiveSubscriptions = activeSubscriptions.length;

      // 2. Calculate total MRR (using monthlyPrice if available)
      let totalMRR = 0;
      activeSubscriptions.forEach((sub) => {
        if (sub.tier.monthlyPrice) {
          totalMRR += sub.tier.monthlyPrice;
        }
      });

      // 3. Calculate average revenue per customer
      let avgRevenuePerCustomer = 0;
      if (totalActiveSubscriptions > 0) {
        avgRevenuePerCustomer = Math.round(totalMRR / totalActiveSubscriptions);
      }

      // 4. Calculate trial conversion rate
      // Trial conversions = groups that upgraded/downgraded from initial subscription
      const conversionHistories =
        await this.prisma.subscriptionHistory.findMany({
          where: {
            changeReason: { in: ['upgrade', 'downgrade'] },
          },
        });

      const trialConversionRate =
        totalActiveSubscriptions > 0
          ? Math.round(
              (conversionHistories.length / totalActiveSubscriptions) * 100,
            )
          : 0;

      // 5. Count tier distribution
      const tierDistribution = await this.prisma.subscriptionTier.findMany({
        select: {
          id: true,
          name: true,
          monthlyPrice: true,
          subscriptions: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      });

      const stats = {
        totalMRR, // in cents
        totalMRRFormatted: `₦${(totalMRR / 100).toLocaleString('en-NG')}`,
        activeSubscriptions: totalActiveSubscriptions,
        trialConversions: trialConversionRate, // percentage
        avgRevenuePerCustomer, // in cents
        avgRevenuePerCustomerFormatted: `₦${(avgRevenuePerCustomer / 100).toLocaleString('en-NG')}`,
        tierBreakdown: tierDistribution.map((tier) => ({
          tierId: tier.id,
          tierName: tier.name,
          monthlyPrice: tier.monthlyPrice,
          activeCount: tier.subscriptions.length,
          mrr: (tier.monthlyPrice || 0) * tier.subscriptions.length,
        })),
        timestamp: new Date(),
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, stats, { ttl: 3600 });

      console.log(`📊 Dashboard stats generated`);
      return stats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error generating dashboard stats: ${errorMsg}`);
      throw error;
    }
  }

  // ============================================
  // SUBSCRIPTION SETTINGS MANAGEMENT
  // ============================================

  /**
   * Get platform-wide subscription settings
   * Cached for 1 hour (rarely changes)
   */
  async getSubscriptionSettings() {
    const cacheKey = 'subscription:settings:platform';

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get or create default settings
      let settings = await (
        this.prisma as any
      ).subscriptionSettings.findFirst();

      if (!settings) {
        // Create default settings on first access
        settings = await (this.prisma as any).subscriptionSettings.create({
          data: {
            trialPeriodEnabled: true,
            trialDurationDays: 14,
            autoRenewalEnabled: true,
            proratePayments: true,
            paymentReminders: true,
            gracePeriodDays: 7,
          },
        });
        console.log(`📋 Created default subscription settings`);
      }

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, settings, { ttl: 3600 });

      return settings;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error fetching subscription settings: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Update platform-wide subscription settings
   * Requires superadmin
   */
  async updateSubscriptionSettings(updateSettingsDto: any) {
    try {
      // Get existing settings or create default
      let settings = await (
        this.prisma as any
      ).subscriptionSettings.findFirst();

      if (!settings) {
        // Create default settings if none exist
        settings = await (this.prisma as any).subscriptionSettings.create({
          data: {
            trialPeriodEnabled: updateSettingsDto.trialPeriodEnabled ?? true,
            trialDurationDays: updateSettingsDto.trialDurationDays ?? 14,
            autoRenewalEnabled: updateSettingsDto.autoRenewalEnabled ?? true,
            proratePayments: updateSettingsDto.proratePayments ?? true,
            paymentReminders: updateSettingsDto.paymentReminders ?? true,
            gracePeriodDays: updateSettingsDto.gracePeriodDays ?? 7,
          },
        });
      } else {
        // Update existing settings
        const updateData: any = {};

        if (updateSettingsDto.trialPeriodEnabled !== undefined) {
          updateData.trialPeriodEnabled = updateSettingsDto.trialPeriodEnabled;
        }
        if (updateSettingsDto.trialDurationDays !== undefined) {
          updateData.trialDurationDays = updateSettingsDto.trialDurationDays;
        }
        if (updateSettingsDto.autoRenewalEnabled !== undefined) {
          updateData.autoRenewalEnabled = updateSettingsDto.autoRenewalEnabled;
        }
        if (updateSettingsDto.proratePayments !== undefined) {
          updateData.proratePayments = updateSettingsDto.proratePayments;
        }
        if (updateSettingsDto.paymentReminders !== undefined) {
          updateData.paymentReminders = updateSettingsDto.paymentReminders;
        }
        if (updateSettingsDto.gracePeriodDays !== undefined) {
          updateData.gracePeriodDays = updateSettingsDto.gracePeriodDays;
        }

        settings = await this.prisma.subscriptionSettings.updateMany({
          data: updateData,
        });
      }

      // Invalidate settings cache
      await this.cacheService.delete('subscription:settings:platform');

      console.log(`✅ Subscription settings updated`);
      return settings;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error updating subscription settings: ${errorMsg}`);
      throw error;
    }
  }
}
