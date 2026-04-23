import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { StoreItemsService } from './store-items.service';
import { CreateStoreItemDto, StoreItemDto } from './dto/create-store-item.dto';
import { GetStoreItemsQueryDto } from './dto/get-store-items-query.dto';
import { GetStoreItemsResponseDto } from './dto/get-store-items-response.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { Req } from '@nestjs/common';
import { Request } from 'express';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@ApiTags('Store Items')
@Controller('store-items')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class StoreItemsController {
  constructor(private readonly storeitemsService: StoreItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new item for the entity' })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: StoreItemDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request or invalid input' })
  async createItem(@Body() body: CreateStoreItemDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) {
      throw new BadRequestException('Entity ID is required');
    }
    const groupId = getEffectiveGroupId(req) as string;
    return this.storeitemsService.createItem(entityId, body, groupId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all items for the entity with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully with stock status and counts',
    type: GetStoreItemsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getItems(
    @Query() query: GetStoreItemsQueryDto,
    @Req() req: Request,
  ): Promise<GetStoreItemsResponseDto> {

    const entityId = getEffectiveEntityId(req);
    if (!entityId) {
      throw new BadRequestException('Entity ID is required');
    }

    return this.storeitemsService.getItems(entityId, query);
  }
}
