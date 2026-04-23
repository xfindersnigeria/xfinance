import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MenuService } from '../menu/menu.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CacheService } from '../cache/cache.service';
import { DEFAULT_CUSTOMIZATION } from '../settings/customization/dto/customization.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private menuService: MenuService,
    private subscriptionService: SubscriptionService,
    private cacheService: CacheService,
  ) {}

  async login(email: string, pass: string) {

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(pass, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update lastLogin timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // NOTE: Permissions are NO LONGER loaded during login
    // Frontend will fetch them via GET /auth/context endpoint
    // This keeps the JWT/cookie minimal: just userId, groupId, entityId, systemRole
    const uniquePermissions: string[] = [];

    // Return minimal user data for token (to keep token size small)
    const tokenPayload = {
      id: user.id,      
      groupId: user.groupId,
      entityId: user.entityId,
      systemRole: user.systemRole,
    };

    // Return full user data (without password) for response to client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        permissions: uniquePermissions,
      },
      tokenPayload,
    };
  }


  /**
   * Get default entity for a user
   * USER scope: uses their assigned entityId
   * ADMIN scope: returns the entityId param or first available
   */
  private async getDefaultEntityForUser(userId: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { entityId: true, role: true },
    });

    if (!user) return undefined;

    if (user.role?.scope === 'USER') {
      return user.entityId || undefined;
    }

    // ADMIN can access multiple entities, prefer first one
    return undefined;
  }

  /**
   * Get full user info and context (whoami endpoint)
   * Returns user data, menu, permissions, subscription, and available entities
   * Called on page load for comprehensive UI initialization
   * Scoped by entityId for all permission/subscription/entity queries
   */
  async getWhoami(
    userId: string,
    groupId: string,
    entityId?: string,
    req?: any,
  ) {
    // Extract impersonation context from request headers (set by AuthGuard)
    const groupImpersonation = req?.groupImpersonation;
    const entityImpersonation = req?.entityImpersonation;

    // Determine effective IDs (impersonated > provided > default)
    const effectiveGroupId = groupImpersonation?.groupId || groupId;
    let effectiveEntityId = entityImpersonation?.entityId || entityId;
    
    if (!effectiveEntityId) {
      effectiveEntityId = await this.getDefaultEntityForUser(userId);
    }

    // Fetch user info first (needed regardless of context)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { id: true, name: true, scope: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // For non-superadmin users: validate they belong to this group
    if (user.systemRole !== 'superadmin' && user.groupId !== groupId) {
      throw new UnauthorizedException('User not found or unauthorized');
    }

    // === HANDLE SUPERADMIN WITHOUT CONTEXT (no group/entity) ===
    if (user.systemRole === 'superadmin' && !effectiveGroupId) {
      // Get superadmin menu (no group/entity context needed)
      const menus = await this.menuService.getMenuForUser(user, undefined, undefined);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          image: user.image,
          systemRole: user.systemRole,
        },
        group: null,
        role: null,
        context: {
          userId,
          groupId: null,
          entityId: null,
          currentEntity: null,
        },
        availableEntities: [],
        menus,
        permissions: {},
        subscription: null,
        cacheTTL: 300,
        expiresAt: Date.now() + 300000,
      };
    }

    // Check cache first (include effective group ID for impersonation context separation)
    const cacheKey = CacheService.keys.userContext(userId, effectiveGroupId, effectiveEntityId);
    
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch user with full relations and entity-scoped permissions (now we have a valid groupId)
    const userWithDetails = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { id: true, name: true, scope: true } },
        explicitPermissions: {
          where: effectiveEntityId ? { entityId: effectiveEntityId } : undefined,
          include: {
            permission: {
              include: {
                action: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    if (!userWithDetails) {
      throw new UnauthorizedException('User not found');
    }

    console.log('User details fetched for whoami:', {
      id: userWithDetails.id,
      email: userWithDetails.email})

    // For non-superadmin users: validate they belong to this group and have a role
    if (userWithDetails.systemRole !== 'superadmin') {
      if (userWithDetails.groupId !== groupId || !userWithDetails.role) {
        throw new UnauthorizedException('User not found or unauthorized');
      }
    }

    // Fetch available entities for user (with caching)
    // Use effective group ID for entity queries (important when impersonating)
    const entitiesCacheKey = CacheService.keys.entitiesForUser(userId, effectiveGroupId);
    let availableEntities: any[] | null = await this.cacheService.get(entitiesCacheKey);
// let availableEntities: any[] | null = null;
    if (!availableEntities) {
      if (userWithDetails.systemRole === 'superadmin') {
        // SUPERADMIN: can see all entities in the context group (or impersonated group)
        availableEntities = await this.prisma.entity.findMany({
          where: { groupId: effectiveGroupId },
          select: { id: true, name: true },
        });
        console.log(availableEntities)
      } else if (userWithDetails.role?.scope === 'USER') {
        // USER scope: can only see their assigned entity
        if (userWithDetails.entityId) {
          availableEntities = [
            await this.prisma.entity.findUnique({
              where: { id: userWithDetails.entityId },
              select: { id: true, name: true },
            }),
          ];
        } else {
          availableEntities = [];
        }
      } else if (userWithDetails.role?.scope === 'ADMIN') {
        // ADMIN scope: can see admin entities array or all entities in their group
        const adminEntities = userWithDetails.adminEntities || [];
        if (adminEntities.length === 0) {
          // Empty adminEntities = full access to all entities in group
          availableEntities = await this.prisma.entity.findMany({
            where: { groupId: effectiveGroupId },
            select: { id: true, name: true },
          });
        } else {
          // Limited to specific entities
          availableEntities = await this.prisma.entity.findMany({
            where: { id: { in: adminEntities }, groupId: effectiveGroupId },
            select: { id: true, name: true },
          });
        }
      }

      // Cache entities for 5 minutes
      await this.cacheService.set(entitiesCacheKey, availableEntities || [], {
        ttl: 300,
      });
    }
    console.log(userId, effectiveEntityId, effectiveGroupId, user.systemRole)

    // Get menu for user with entity scoping
    const menus = await this.menuService.getMenuForUser(
      user,
      effectiveEntityId,
      effectiveGroupId,
    );

    // Get user permissions for this entity
    const permissions = await this.menuService.getUserPermissions(user);

    // Fetch group information (use effective group ID for impersonation context)
    let groupInfo = userWithDetails.group;
    if (groupImpersonation || !userWithDetails.group) {
      // If impersonating or user has no base group, fetch the effective group
      groupInfo = await this.prisma.group.findUnique({
        where: { id: effectiveGroupId },
        select: {
          id: true,
          name: true,
          subdomain: true,
        },
      });
    }

    // Fetch group customization (theme / branding)
    const customizationRecord = await this.cacheService.getOrSet(
      `customization:${effectiveGroupId}`,
      async () => {
        const record = await this.prisma.groupCustomization.findUnique({
          where: { groupId: effectiveGroupId },
          select: { primaryColor: true, logoUrl: true, loginBgUrl: true },
        });
        return {
          primaryColor: record?.primaryColor ?? DEFAULT_CUSTOMIZATION.primaryColor,
          logoUrl: record?.logoUrl ?? null,
          loginBgUrl: record?.loginBgUrl ?? null,
        };
      },
      3600,
    );

    // Get subscription info (cached at effective group level)
    const subscription = await this.cacheService.getOrSet(
      CacheService.keys.subscriptionTier(effectiveGroupId),
      async () => {
        return this.prisma.subscription.findFirst({
          where: { groupId: effectiveGroupId, isActive: true },
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
      },
      300,
    );

    const response = {
      user: {
        id: userWithDetails.id,
        email: userWithDetails.email,
        firstName: userWithDetails.firstName,
        lastName: userWithDetails.lastName,
        image: userWithDetails.image,
        systemRole: userWithDetails.systemRole,
      },
      group: groupInfo,
      role: userWithDetails.role ? {
        id: userWithDetails.roleId,
        name: userWithDetails.role.name,
        scope: userWithDetails.role.scope,
        adminEntities: userWithDetails.adminEntities || [],
      } : null,
      context: {
        userId,
        groupId: effectiveGroupId,
        entityId: effectiveEntityId,
        currentEntity: availableEntities?.find((e) => e?.id === effectiveEntityId),
      },
      availableEntities: availableEntities || [],
      menus,
      permissions,
      subscription: subscription
        ? {
            id: subscription.id,
            tierId: subscription.subscriptionTierId,
            tierName: subscription.tier.name,
            startDate: subscription.createdAt,
            endDate: subscription.endDate,
            isActive: subscription.isActive,
            modules: subscription.tier.subscriptionModules.map((sm) => ({
              id: sm.module.id,
              key: sm.module.moduleKey,
              name: sm.module.displayName,
              scope: sm.module.scope,
            })),
          }
        : null,
      // Include impersonation context if impersonating
      ...(groupImpersonation || entityImpersonation ? {
        impersonation: {
          isImpersonating: true,
          originalGroupId: groupId,
          impersonatedGroupId: groupImpersonation?.groupId,
          originalEntityId: entityId,
          impersonatedEntityId: entityImpersonation?.entityId,
          impersonatedByUser: userId,
        },
      } : {}),
      customization: customizationRecord,
      cacheTTL: 300, // 5 minutes
      expiresAt: Date.now() + 300000,
    };

    // Cache for 5 minutes with entity-level key
    await this.cacheService.set(cacheKey, response, { ttl: 300 });

    return response;
  }

}