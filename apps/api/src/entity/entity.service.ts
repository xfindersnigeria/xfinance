import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { GetEntitiesQueryDto } from './dto/get-entities-query.dto';
import { BullmqService } from '@/bullmq/bullmq.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { CacheService } from '@/cache/cache.service';
import { CacheInvalidationService } from '@/cache/cache-invalidation.service';
import { PubsubService } from '@/cache/pubsub.service';
import { createId } from '@paralleldrive/cuid2';
import { SubscriptionService } from '@/subscription/subscription.service';

@Injectable()
export class EntityService {
  constructor(
    private prisma: PrismaService,
    private fileuploadService: FileuploadService,
    private bullmqService: BullmqService,
    private cacheService: CacheService,
    private cacheInvalidationService: CacheInvalidationService,
    private pubsubService: PubsubService,
    private subscriptionService: SubscriptionService,
  ) {}

  // async create(createEntityDto: CreateEntityDto, effectiveGroupId: string) {
  //   return this.prisma.entity.create({
  //     data: { ...createEntityDto, groupId: effectiveGroupId },
  //   });
  // }

  async create(
    createEntityDto: CreateEntityDto,
    effectiveGroupId: string,
    file?: Express.Multer.File,
  ) {
    try {
      let logo: any = undefined;

      // Pre-generate the entity ID so we can scope the Cloudinary path before
      // the DB record exists (upload happens before insert).
      const entityId = createId();

      // Upload logo to Cloudinary if provided
      if (file) {
        const folder = this.fileuploadService.buildAssetPath(
          effectiveGroupId,
          entityId,
        );
        logo = await this.fileuploadService.uploadFile(file, folder);
      }

      // Always set logo with publicId and secureUrl, defaulting to empty string if not provided
      const logoData = {
        publicId: logo?.publicId || '',
        secureUrl: logo?.secureUrl || '',
      };
      console.log(
        {
          id: entityId,
          name: createEntityDto.name,
          legalName: createEntityDto.legalName,
          taxId: createEntityDto.taxId,
          country: createEntityDto.country,
          currency: createEntityDto.currency,
          yearEnd: createEntityDto.yearEnd,
          address: createEntityDto.address,
          city: createEntityDto.city,
          state: createEntityDto.state,
          postalCode: createEntityDto.postalCode,
          phoneNumber: createEntityDto.phoneNumber,
          email: createEntityDto.email,

          // ...createEntityDto,
          groupId: effectiveGroupId,
          logo: logoData,
        },
        'groupid',
      );

      const entity = await this.prisma.entity.create({
        data: {
          id: entityId,
          name: createEntityDto.name,
          legalName: createEntityDto.legalName,
          taxId: createEntityDto.taxId,
          country: createEntityDto.country,
          currency: createEntityDto.currency,
          yearEnd: createEntityDto.yearEnd,
          address: createEntityDto.address,
          city: createEntityDto.city,
          state: createEntityDto.state,
          postalCode: createEntityDto.postalCode,
          phoneNumber: createEntityDto.phoneNumber,
          email: createEntityDto.email,

          // ...createEntityDto,
          groupId: effectiveGroupId,
          logo: logoData,
        },
      });

      // Bootstrap entity config with the currency set at creation time
      await this.prisma.settings.create({
        data: { entityId: entity.id, groupId: effectiveGroupId, baseCurrency: createEntityDto.currency ?? null, multiCurrency: false },
      });

      // Enqueue background job to seed default accounts for the entity
      await this.bullmqService.addJob('create-entity-user', {
        entityId: entity.id,
        groupId: effectiveGroupId,
      });

      await this.subscriptionService.incrementEntityCount(effectiveGroupId);

      // Invalidate whoami/user context caches AND entities caches for all users in the group
      // When entity is created, users' available entities list changes
      console.log(
        `\n⏱️ [ENTITY CREATE] Starting cache invalidation for group: ${effectiveGroupId}`,
      );
      await this.cacheService.deleteWhoamiCacheForGroup(effectiveGroupId);
      await this.cacheService.deletePattern(`entities:${effectiveGroupId}:*`);
      console.log(
        `✓ [ENTITY CREATE] Cleared whoami + entities caches for group: ${effectiveGroupId}`,
      );

      // Publish pubsub event so WebSocket clients refetch whoami
      await this.pubsubService.publish(
        `whoami-invalidate:${effectiveGroupId}`,
        {
          type: 'whoami-invalidate',
          groupId: effectiveGroupId,
          reason: 'entity-created',
          entityId: entity.id,
          timestamp: new Date(),
        },
      );
      console.log(
        `📢 Pubsub event published: whoami-invalidate:${effectiveGroupId} (reason: entity-created, entityId: ${entity.id})`,
      );

      return entity;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll(query: GetEntitiesQueryDto, effectiveGroupId: string) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = { groupId: effectiveGroupId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Avoid starting a DB transaction for simple reads — some serverless DB
    // providers (e.g. Neon) can error when many transactions are started.
    const [data, total] = await Promise.all([
      this.prisma.entity.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.entity.count({ where }),
    ]);

    return {
      entities: data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, effectiveGroupId: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found.`);
    }
    if (entity.groupId !== effectiveGroupId) {
      throw new ForbiddenException(
        'You do not have permission to access this entity.',
      );
    }
    return entity;
  }

  async update(
    id: string,
    updateEntityDto: UpdateEntityDto,
    effectiveGroupId: string,
  ) {
    await this.findOne(id, effectiveGroupId); // Reuse findOne to check for existence and permission

    const result = await this.prisma.entity.update({
      where: { id },
      data: updateEntityDto,
    });

    // Invalidate whoami/user context caches AND entities caches for all users in the group
    // When entity is updated, users' entity details and available entities list may have changed
    console.log(
      `\n⏱️ [ENTITY UPDATE] Starting cache invalidation for group: ${effectiveGroupId}`,
    );
    await this.cacheService.deleteWhoamiCacheForGroup(effectiveGroupId);
    await this.cacheService.deletePattern(`entities:${effectiveGroupId}:*`);
    console.log(
      `✓ [ENTITY UPDATE] Cleared whoami + entities caches for group: ${effectiveGroupId}`,
    );

    // Publish pubsub event so WebSocket clients refetch whoami
    await this.pubsubService.publish(`whoami-invalidate:${effectiveGroupId}`, {
      type: 'whoami-invalidate',
      groupId: effectiveGroupId,
      reason: 'entity-updated',
      entityId: id,
      timestamp: new Date(),
    });
    console.log(
      `📢 Pubsub event published: whoami-invalidate:${effectiveGroupId} (reason: entity-updated, entityId: ${id})`,
    );

    return result;
  }

  async remove(id: string, effectiveGroupId: string) {
    await this.findOne(id, effectiveGroupId); // Reuse findOne to check for existence and permission

    const result = await this.prisma.entity.delete({ where: { id } });

    await this.subscriptionService.decrementEntityCount(effectiveGroupId);

    // Invalidate whoami/user context caches AND entities caches for all users in the group
    // When entity is deleted, users' available entities list changes
    console.log(
      `\n⏱️ [ENTITY DELETE] Starting cache invalidation for group: ${effectiveGroupId}`,
    );
    await this.cacheService.deleteWhoamiCacheForGroup(effectiveGroupId);
    await this.cacheService.deletePattern(`entities:${effectiveGroupId}:*`);
    console.log(
      `✓ [ENTITY DELETE] Cleared whoami + entities caches for group: ${effectiveGroupId}`,
    );

    // Publish pubsub event so WebSocket clients refetch whoami
    await this.pubsubService.publish(`whoami-invalidate:${effectiveGroupId}`, {
      type: 'whoami-invalidate',
      groupId: effectiveGroupId,
      reason: 'entity-deleted',
      entityId: id,
      timestamp: new Date(),
    });
    console.log(
      `📢 Pubsub event published: whoami-invalidate:${effectiveGroupId} (reason: entity-deleted, entityId: ${id})`,
    );

    return result;
  }
}
