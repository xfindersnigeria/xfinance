import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';

@Injectable()
export class SettingsModulesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private pubsubService: PubsubService,
  ) {}

  /**
   * Toggle an entire menu on/off for an entity.
   * Finds all optional modules with the given menu name, then
   * adds or removes their IDs from entity.disabledModuleIds.
   * Busts all whoami/context caches for the group and publishes
   * a realtime invalidation so every connected client refetches.
   */
  async toggleMenu(menuName: string, enabled: boolean, entityId: string, groupId: string) {
    try {
      // Find all optional modules under this menu
      const modules = await this.prisma.module.findMany({
        where: { menu: menuName, isOptional: true },
        select: { id: true },
      });

      if (!modules.length) {
        throw new HttpException(`No optional modules found for menu: ${menuName}`, HttpStatus.NOT_FOUND);
      }

      const moduleIds = modules.map((m) => m.id);

      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { disabledModuleIds: true },
      });

      if (!entity) throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);

      let updated: string[];
      if (enabled) {
        // Remove these module IDs from disabledModuleIds
        updated = entity.disabledModuleIds.filter((id) => !moduleIds.includes(id));
      } else {
        // Add module IDs not already tracked
        const toAdd = moduleIds.filter((id) => !entity.disabledModuleIds.includes(id));
        updated = [...entity.disabledModuleIds, ...toAdd];
      }

      await this.prisma.entity.update({
        where: { id: entityId },
        data: { disabledModuleIds: updated },
      });

      // ctx keys: ctx:{groupId}:{userId}:{entityId}
      await this.cacheService.deletePattern(`ctx:${groupId}:*`);
      // menu keys: menu:{userId}:{groupId}:{entityId}
      await this.cacheService.deletePattern(`menu:*:${groupId}:*`);

      // Notify all connected clients in this group to refetch whoami
      await this.pubsubService.publish(`whoami-invalidate:${groupId}`, {
        type: 'whoami-invalidate',
        groupId,
        reason: 'module-toggle',
        entityId,
        timestamp: Date.now(),
      });

      return {
        data: { menuName, enabled, affectedModules: moduleIds.length },
        message: `Menu "${menuName}" ${enabled ? 'enabled' : 'disabled'} successfully`,
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
