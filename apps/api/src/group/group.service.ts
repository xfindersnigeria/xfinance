import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '@/cache/cache.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GetGroupsQueryDto } from './dto/get-groups-query.dto';
import { generateSubdomain } from '@/auth/utils/helper';
import { createId } from '@paralleldrive/cuid2';
import 'multer';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private fileuploadService: FileuploadService,
    private bullmqService: BullmqService,
  ) {}

  async create(createGroupDto: CreateGroupDto, file?: Express.Multer.File) {
    try {
      let logo: any = undefined;

      // Pre-generate the group ID so we can scope the Cloudinary path before
      // the DB record exists (upload happens before insert).
      const groupId = createId();

      // Upload logo to Cloudinary if provided
      if (file) {
        const folder = this.fileuploadService.buildAssetPath(groupId);
        logo = await this.fileuploadService.uploadFile(file, folder);
      }

      console.log('logo data', logo);
      // Always set logo with publicId and secureUrl, defaulting to empty string if not provided
      const logoData = {
        publicId: logo?.publicId || '',
        secureUrl: logo?.secureUrl || '',
      };

      const group = await this.prisma.group.create({
        data: {
          id: groupId,
          ...createGroupDto,
          subdomain: generateSubdomain(createGroupDto.name),
          logo: logoData,
        },
      });

      // Sync logo to GroupCustomization so the public branding page and
      // login page always use the same asset as the group logo.
      if (logo?.secureUrl) {
        await this.prisma.groupCustomization.upsert({
          where: { groupId: group.id },
          create: { groupId: group.id, logoUrl: logo.secureUrl, logoPublicId: logo.publicId },
          update: { logoUrl: logo.secureUrl, logoPublicId: logo.publicId },
        });
      }

      // enqueue background job to create default role and owner user
      await this.bullmqService.addJob('create-group-user', {
        groupId: group.id,
        email: createGroupDto.email,
        groupName: createGroupDto.name,
        groupSlug: group.subdomain,
        logo: logo.secureUrl,
      });

      return group;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // async create(createGroupDto: CreateGroupDto, file?: Express.Multer.File) {
  //   try {
  //     let logo: any = undefined;

  //     // Upload logo if provided
  //     if (file) {
  //       logo = await this.fileuploadService.uploadFile(file, 'groups');
  //     }

  //     const logoData = {
  //       publicId: logo?.publicId || '',
  //       secureUrl: logo?.secureUrl || '',
  //     };

  //     // ────────────────────────────────────────────────
  //     //           The important part starts here
  //     // ────────────────────────────────────────────────

  //     return await this.prisma.$transaction(async (tx) => {
  //       // 1. Create the group
  //       const group = await tx.group.create({
  //         data: {
  //           ...createGroupDto,
  //           logo: logoData,
  //         },
  //       });

  //       // 2. Create the owner/admin user (assuming createGroupDto has these fields)
  //       //    Adjust field names if they are different in your DTO
  //       const password = 'Password123';
  //       const hashPassword = await bcrypt.hash(password, 10);
  //       const owner = await tx.user.create({
  //         data: {
  //           email: createGroupDto.email,
  //           firstName: createGroupDto.name,
  //           lastName: 'Admin',
  //           groupId: group.id,
  //           password: hashPassword,
  //         },
  //       });

  //       // Optional: return both for the controller
  //       return {
  //         group,
  //         owner: {
  //           id: owner.id,
  //           email: owner.email,
  //           firstName: owner.firstName,
  //           lastName: owner.lastName,
  //         },
  //       };
  //     });
  //   } catch (error) {
  //     // Improve error message — especially useful in development
  //     const message = error instanceof Error ? error.message : 'Unknown error';

  //     if (error.code === 'P2002') {
  //       throw new HttpException(
  //         'Email or group name already exists',
  //         HttpStatus.CONFLICT,
  //       );
  //     }

  //     throw new HttpException(
  //       `Failed to create group: ${message}`,
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  // }

  async findAll(query: GetGroupsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    // Build where clause for search
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Avoid starting a DB transaction for simple reads — some serverless DB
    // providers (e.g. Neon) can error when many transactions are started.
    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              entities: true,
            },
          },
          subscription: {
            select: {
              isActive: true,
              tier: {
                select: {
                  monthlyPrice: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    // Enhance data with user count, entity count, and MRR (monthly recurring revenue)
    const enrichedGroups = data.map((group: any) => ({
      ...group,
      userCount: group._count.users,
      entityCount: group._count.entities,
      mrr: group.subscription?.tier?.monthlyPrice ? Math.floor(group.subscription.tier.monthlyPrice) : 0, // Convert from cents to currency
      subscriptionStatus: group.subscription?.isActive ? 'active' : 'inactive',
      plan: group.subscription?.tier?.name || 'free',
      _count: undefined, // Remove the raw count object from response
    }));

    return {
      groups: enrichedGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  findOne(id: string) {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async update(
    id: string,
    updateGroupDto: UpdateGroupDto,
    file?: Express.Multer.File,
  ) {
    try {
      let logo: any = undefined;

      // Upload new logo to Cloudinary if provided
      if (file) {
        const folder = this.fileuploadService.buildAssetPath(id);
        logo = await this.fileuploadService.uploadFile(file, folder);
      }

      const updatedGroup = await this.prisma.group.update({
        where: { id },
        data: {
          ...updateGroupDto,
          ...(logo && {
            logo: { publicId: logo.publicId, secureUrl: logo.secureUrl },
          }),
        },
      });

      // Keep customization in sync with the new logo
      if (logo?.secureUrl) {
        await this.prisma.groupCustomization.upsert({
          where: { groupId: id },
          create: { groupId: id, logoUrl: logo.secureUrl, logoPublicId: logo.publicId },
          update: { logoUrl: logo.secureUrl, logoPublicId: logo.publicId },
        });
        // Bust the customization cache so the updated logo is served immediately
        await this.cacheService.delete(`customization:${id}`);
      }

      return updatedGroup;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: string) {
    try {
      const [usersCount, entitiesCount] = await Promise.all([
        this.prisma.user.count({ where: { groupId: id } }),
        this.prisma.entity.count({ where: { groupId: id } }),
      ]);

      const blockers: string[] = [];
      if (usersCount > 0) blockers.push(`users (${usersCount})`);
      if (usersCount > 0) blockers.push(`users (${usersCount})`);
      if (entitiesCount > 0) blockers.push(`entities (${entitiesCount})`);

      if (blockers.length > 0) {
        throw new HttpException(
          `Cannot delete group because related records exist: ${blockers.join(', ')}`,
          HttpStatus.CONFLICT,
        );
      }

      try {
        return await this.prisma.group.delete({ where: { id } });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2003'
        ) {
          throw new HttpException(
            'Cannot delete group because related records exist',
            HttpStatus.CONFLICT,
          );
        }
        throw err;
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new HttpException(
          'Cannot delete group because related records exist',
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get superadmin dashboard group statistics
   * Returns: Total groups, Active, Trial, Suspended
   * Cached for 1 hour
   */
  async getSuperadminGroupStats() {
    const cacheKey = 'groups:superadmin:stats';

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get subscription settings for trial duration
      const settings = await (this.prisma as any).subscriptionSettings.findFirst();
      const trialDurationDays = settings?.trialDurationDays || 14;
      const trialEndDate = new Date(Date.now() - trialDurationDays * 24 * 60 * 60 * 1000);

      // 1. Total groups count
      const totalGroups = await this.prisma.group.count();

      // 2. Active groups - subscription is active and not in trial
      const activeGroups = await this.prisma.group.count({
        where: {
          subscription: {
            isActive: true,
            startDate: {
              lt: trialEndDate, // Started before trial period
            },
          },
        },
      });

      // 3. Trial groups - subscription exists but within trial period
      const trialGroups = await this.prisma.group.count({
        where: {
          subscription: {
            startDate: {
              gte: trialEndDate, // Started within trial period
            },
          },
        },
      });

      // 4. Suspended groups - subscription is inactive
      const suspendedGroups = await this.prisma.group.count({
        where: {
          subscription: {
            isActive: false,
          },
        },
      });

      const stats = {
        totalGroups,
        activeGroups,
        trialGroups,
        suspendedGroups,
        timestamp: new Date(),
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, stats, { ttl: 3600 });

      console.log(`📊 Group stats generated`);
      return stats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error generating group stats: ${errorMsg}`);
      throw new HttpException(
        `Failed to generate group statistics: ${errorMsg}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

 
}
