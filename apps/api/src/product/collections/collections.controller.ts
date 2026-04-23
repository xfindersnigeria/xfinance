import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionDto,
} from './dto/create-collection.dto';
import { GetCollectionsQueryDto } from './dto/get-collections-query.dto';
import { GetCollectionsResponseDto } from './dto/get-collections-response.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { Req } from '@nestjs/common';
import { Request } from 'express';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { CollectionsWithStatsDto } from './dto/collection-stats.dto';

@ApiTags('Collections')
@Controller('collections')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class CollectionsController {
  constructor(private readonly collectionService: CollectionsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Spring Sale' },
        slug: { type: 'string', example: 'spring-sale' },
        description: { type: 'string', example: 'Collection description' },
        visibility: { type: 'boolean', example: false },
        featured: { type: 'boolean', example: false },
        itemIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['item-id-1', 'item-id-2'],
        },
        image: { type: 'string', format: 'binary' },
      },
      required: ['name', 'description'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Collection created successfully',
    type: CollectionDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request or invalid input' })
  async createCollection(
    @Body() body: CreateCollectionDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');

    return this.collectionService.createCollection(entityId, body, file, groupId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all collections with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'Collections retrieved successfully',
    type: GetCollectionsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getCollections(
    @Query() query: GetCollectionsQueryDto,
    @Req() req: Request,
  ): Promise<CollectionsWithStatsDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.collectionService.getCollections(entityId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a collection by ID' })
  @ApiParam({
    name: 'id',
    description: 'Collection ID',
    example: 'collection-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Collection retrieved successfully',
    type: CollectionDto,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getCollectionById(
    @Param('id') collectionId: string,
    @Req() req: Request,
  ): Promise<CollectionDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.collectionService.getCollectionById(collectionId, entityId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a collection by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Collection slug',
    example: 'spring-sale',
  })
  @ApiResponse({
    status: 200,
    description: 'Collection retrieved successfully',
    type: CollectionDto,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getCollectionBySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<CollectionDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.collectionService.getCollectionBySlug(slug, entityId);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update a collection' })
  @ApiParam({
    name: 'id',
    description: 'Collection ID',
    example: 'collection-uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Spring Sale' },
        slug: { type: 'string', example: 'spring-sale' },
        description: { type: 'string', example: 'Collection description' },
        visibility: { type: 'boolean', example: false },
        featured: { type: 'boolean', example: false },
        itemIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['item-id-1', 'item-id-2'],
        },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Collection updated successfully',
    type: CollectionDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async updateCollection(
    @Param('id') collectionId: string,
    @Body() body: UpdateCollectionDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CollectionDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');

    return this.collectionService.updateCollection(
      collectionId,
      entityId,
      body,
      file,
      groupId,
    );
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a collection' })
  @ApiParam({
    name: 'id',
    description: 'Collection ID',
    example: 'collection-uuid',
  })
  @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async deleteCollection(
    @Param('id') collectionId: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.collectionService.deleteCollection(collectionId, entityId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to a collection' })
  @ApiParam({
    name: 'id',
    description: 'Collection ID',
    example: 'collection-uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        itemIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['item-id-1', 'item-id-2'],
        },
      },
      required: ['itemIds'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Items added to collection successfully',
    type: CollectionDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async addItemsToCollection(
    @Param('id') collectionId: string,
    @Body('itemIds') itemIds: string[],
    @Req() req: Request,
  ): Promise<CollectionDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw new BadRequestException('itemIds must be a non-empty array');
    }

    return this.collectionService.addItemsToCollection(
      collectionId,
      entityId,
      itemIds,
    );
  }

  @Delete(':id/items')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove items from a collection' })
  @ApiParam({
    name: 'id',
    description: 'Collection ID',
    example: 'collection-uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        itemIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['item-id-1', 'item-id-2'],
        },
      },
      required: ['itemIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Items removed from collection successfully',
    type: CollectionDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async removeItemsFromCollection(
    @Param('id') collectionId: string,
    @Body('itemIds') itemIds: string[],
    @Req() req: Request,
  ): Promise<CollectionDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw new BadRequestException('itemIds must be a non-empty array');
    }

    return this.collectionService.removeItemsFromCollection(
      collectionId,
      entityId,
      itemIds,
    );
  }
}
