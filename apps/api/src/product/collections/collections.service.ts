import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCollectionDto, UpdateCollectionDto, CollectionDto, CollectionItemDto } from './dto/create-collection.dto';
import { GetCollectionsQueryDto } from './dto/get-collections-query.dto';
import { GetCollectionsResponseDto } from './dto/get-collections-response.dto';
import { CollectionStatsDto, CollectionsWithStatsDto } from './dto/collection-stats.dto';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { generateSlug } from './utils/slug.util';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileuploadService: FileuploadService,
  ) {}

  /**
   * Create a new collection
   */
  async createCollection(
    entityId: string,
    body: CreateCollectionDto,
    file?: Express.Multer.File,
    groupId?: string,
  ): Promise<CollectionDto> {
    try {
      // Generate slug from name if not provided
      const slug = body.slug ? body.slug : generateSlug(body.name);

      // Check if slug is unique for this entity
      const existingCollection = await this.prisma.collection.findFirst({
        where: { slug, entityId },
      });

      if (existingCollection) {
        throw new BadRequestException(
          `Collection with slug "${slug}" already exists for this entity`,
        );
      }

      let image: { publicId: string; secureUrl: string } | undefined = undefined;

      if (file) {
        try {
          const folder = groupId
            ? this.fileuploadService.buildAssetPath(groupId, entityId, 'collections')
            : `collections/${entityId}`;
          const uploadResult = await this.fileuploadService.uploadFile(file, folder);
          image = {
            publicId: uploadResult.publicId,
            secureUrl: uploadResult.secureUrl,
          };
        } catch (error: any) {
          throw new BadRequestException(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const collection = await this.prisma.collection.create({
        data: {
          name: body.name,
          slug,
          description: body.description,
          visibility: body.visibility === 'true' ? true : false,
          featured: body.featured === 'true' ? true : false,
          entityId,
          groupId: groupId ?? '',
          image,
        },
        include: {
          items: {
            include: {
              storeItems: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      // console.log(body.itemIds, 'item ids', body);

      // Add items to collection if provided
      if (body.itemIds && body.itemIds.length > 0) {
        await Promise.all(
          JSON.parse(body.itemIds).map(( itemId, index) =>
            this.prisma.collectionStoreItem.create({
              data: {
                collectionId: collection.id,
                storeItemId:  itemId,
                sortOrder: index,
              },
            }),
          ),
        );

        // Refetch to get updated items
        const updatedCollection = await this.prisma.collection.findUnique({
          where: { id: collection.id },
          include: {
            items: {
              include: {
                storeItems: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        });

        return this.formatCollection(updatedCollection);
      }

      return this.formatCollection(collection);
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get collection statistics
   */
  private async getCollectionStats(
    entityId: string,
  ): Promise<CollectionStatsDto> {
    try {
      // Get total collections count
      const totalCollections = await this.prisma.collection.count({
        where: { entityId },
      });

      // Get active collections count (visible on online store)
      const activeCollections = await this.prisma.collection.count({
        where: { entityId, visibility: true },
      });

      // Get total items across all collections
      const collectionItems = await this.prisma.collectionStoreItem.findMany({
        where: {
          collection: {
            entityId,
          },
        },
        include: {
          storeItems: true,
        },
      });
      const totalItems = collectionItems.length;
      const totalValue = collectionItems.reduce((sum, item) => {
        const price = item.storeItems?.sellingPrice || 0;
        return sum + price;
      }, 0);

      // Find most popular collection (with most items)
      const allCollectionsWithItems = await this.prisma.collection.findMany({
        where: { entityId },
        include: {
          items: true,
        },
      });

      let mostPopularCollection = 'N/A';
      let mostPopularItemCount = 0;

      if (allCollectionsWithItems.length > 0) {
        const populars = allCollectionsWithItems.sort(
          (a, b) => b.items.length - a.items.length,
        );
        mostPopularCollection = populars[0].name;
        mostPopularItemCount = populars[0].items.length;
      }

      return {
        totalCollections,
        activeCollections,
        totalItems,
        totalValue: Number(totalValue.toFixed(2)),
        mostPopularCollection,
        mostPopularItemCount,
      };
    } catch (error: any) {
      // Return default stats if calculation fails
      return {
        totalCollections: 0,
        activeCollections: 0,
        totalItems: 0,
        totalValue: 0,
        mostPopularCollection: 'Best Sellers',
        mostPopularItemCount: 0,
      };
    }
  }

  /**
   * Get all collections with pagination
   */
  async getCollections(
    entityId: string,
    query: GetCollectionsQueryDto,
  ): Promise<CollectionsWithStatsDto> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    console.log(query, 'query in service', entityId); // Debug log

    const where: any = { entityId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [collections, total] = await Promise.all([
      this.prisma.collection.findMany({
        where,
        include: {
          items: {
            include: {
              storeItems: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.collection.count({ where }),
    ]);

    const transformed = collections.map(c => this.formatCollection(c));
    const totalPages = Math.ceil(total / limit);
    const stats = await this.getCollectionStats(entityId);

    return {
      stats,
      collections: transformed,
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * Get a single collection by ID
   */
  async getCollectionById(
    collectionId: string,
    entityId: string,
  ): Promise<CollectionDto> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, entityId },
      include: {
        items: {
          include: {
            storeItems: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.formatCollection(collection);
  }

  /**
   * Get a single collection by slug
   */
  async getCollectionBySlug(
    slug: string,
    entityId: string,
  ): Promise<CollectionDto> {
    const collection = await this.prisma.collection.findFirst({
      where: { slug, entityId },
      include: {
        items: {
          include: {
            storeItems: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.formatCollection(collection);
  }

  /**
   * Update a collection
   */
  async updateCollection(
    collectionId: string,
    entityId: string,
    body: UpdateCollectionDto,
    file?: Express.Multer.File,
    groupId?: string,
  ): Promise<CollectionDto> {
    try {
      const collection = await this.prisma.collection.findFirst({
        where: { id: collectionId, entityId },
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const dataToUpdate: any = {};

      if (body.name) {
        dataToUpdate.name = body.name;
      }

      if (body.slug) {
        // Check if new slug is unique for this entity
        const existingCollection = await this.prisma.collection.findFirst({
          where: {
            slug: body.slug,
            entityId,
            id: { not: collectionId },
          },
        });

        if (existingCollection) {
          throw new BadRequestException(
            `Collection with slug "${body.slug}" already exists for this entity`,
          );
        }
        dataToUpdate.slug = body.slug;
      }

      if (body.description !== undefined) {
        dataToUpdate.description = body.description;
      }

      if (body.visibility !== undefined) {
        dataToUpdate.visibility = body.visibility === 'true' ? true : false;
      }

      if (body.featured !== undefined) {
        dataToUpdate.featured = body.featured === 'true' ? true : false;
      }

      if (file) {
        try {
          const folder = groupId
            ? this.fileuploadService.buildAssetPath(groupId, entityId, 'collections')
            : `collections/${entityId}`;
          const uploadResult = await this.fileuploadService.uploadFile(file, folder);
          dataToUpdate.image = {
            publicId: uploadResult.publicId,
            secureUrl: uploadResult.secureUrl,
          };
        } catch (error: any) {
          throw new BadRequestException(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const updatedCollection = await this.prisma.collection.update({
        where: { id: collectionId },
        data: dataToUpdate,
        include: {
          items: {
            include: {
              storeItems: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      // Update items if provided
      if (body.itemIds !== undefined) {
        // Delete existing items
        await this.prisma.collectionStoreItem.deleteMany({
          where: { collectionId },
        });

        // Add new items
        if (body.itemIds.length > 0) {
          await Promise.all(
            JSON.parse(body.itemIds).map(( itemId, index) =>
              this.prisma.collectionStoreItem.create({
                data: {
                  collectionId,
                  storeItemId: itemId,
                  sortOrder: index,
                },
              }),
            ),
          );
        }

        // Refetch to get updated items
        const refreshedCollection = await this.prisma.collection.findUnique({
          where: { id: collectionId },
          include: {
            items: {
              include: {
                storeItems: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        });

        return this.formatCollection(refreshedCollection);
      }

      return this.formatCollection(updatedCollection);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(
    collectionId: string,
    entityId: string,
  ): Promise<{ message: string }> {
    try {
      const collection = await this.prisma.collection.findFirst({
        where: { id: collectionId, entityId },
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Delete collection (cascade will delete collection items)
      await this.prisma.collection.delete({
        where: { id: collectionId },
      });

      return { message: 'Collection deleted successfully' };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Add items to a collection
   */
  async addItemsToCollection(
    collectionId: string,
    entityId: string,
    itemIds: string[],
  ): Promise<CollectionDto> {
    try {
      const collection = await this.prisma.collection.findFirst({
        where: { id: collectionId, entityId },
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Get current items count for sort order
      const currentItems = await this.prisma.collectionStoreItem.findMany({
        where: { collectionId },
        orderBy: { sortOrder: 'desc' },
        take: 1,
      });

      let sortOrder = currentItems.length > 0 ? currentItems[0].sortOrder + 1 : 0;

      // Add items
      await Promise.all(
        itemIds.map((itemId) =>
          this.prisma.collectionStoreItem.create({
            data: {
              collectionId,
              storeItemId: itemId,
              sortOrder: sortOrder++,
            },
          }),
        ),
      );

      // Refetch collection
      const updatedCollection = await this.prisma.collection.findUnique({
        where: { id: collectionId },
        include: {
          items: {
            include: {
              storeItems: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      return this.formatCollection(updatedCollection);
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Remove items from a collection
   */
  async removeItemsFromCollection(
    collectionId: string,
    entityId: string,
    itemIds: string[],
  ): Promise<CollectionDto> {
    try {
      const collection = await this.prisma.collection.findFirst({
        where: { id: collectionId, entityId },
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Remove items
      await this.prisma.collectionStoreItem.deleteMany({
        where: {
          collectionId,
          storeItemId: { in: itemIds },
        },
      });

      // Refetch collection
      const updatedCollection = await this.prisma.collection.findUnique({
        where: { id: collectionId },
        include: {
          items: {
            include: {
              storeItems: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      return this.formatCollection(updatedCollection);
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Format collection data for response
   */
  private formatCollection(collection: any): CollectionDto & { totalValue: number; totalItems: number } {
    // console.log(collection, 'collection in formatCollection'); // Debug log
    const items = collection.items.map((ci: any) => this.formatCollectionItem(ci));
    const totalValue = items.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
    const totalItems = items.length;
    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      image: collection.image
        ? (collection.image as Record<string, any>)
        : undefined,
      visibility: collection.visibility,
      featured: collection.featured,
      items,
      totalValue,
      totalItems,
      createdAt:
        collection.createdAt instanceof Date
          ? collection.createdAt.toISOString()
          : collection.createdAt,
      updatedAt:
        collection.updatedAt instanceof Date
          ? collection.updatedAt.toISOString()
          : collection.updatedAt,
    };
  }

  /**
   * Format collection item for response
   */
  private formatCollectionItem(collectionItem: any): CollectionItemDto {
    // console.log(collectionItem, 'collection item in formatCollectionItem'); // Debug log
    return {
      id: collectionItem.storeItems.id,
      name: collectionItem.storeItems.name,
      category: collectionItem.storeItems.category,
      sellingPrice: collectionItem.storeItems.sellingPrice,
      sortOrder: collectionItem.sortOrder,
      createdAt:
        collectionItem.storeItems.createdAt instanceof Date
          ? collectionItem.storeItems.createdAt.toISOString()
          : collectionItem.storeItems.createdAt,
    };
  }
}

