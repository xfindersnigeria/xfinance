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
import { ItemsService } from './items.service';
import { CreateItemDto, ItemDto } from './dto/create-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { GetItemsResponseDto } from './dto/get-items-response.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { Req } from '@nestjs/common';
import { Request } from 'express';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@ApiTags('Items')
@Controller('items')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new item for the entity' })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: ItemDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request or invalid input' })
  async createItem(@Body() body: CreateItemDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) {
      throw new BadRequestException('Entity ID is required');
    }
    const groupId = getEffectiveGroupId(req) as string;
    return this.itemsService.createItem(entityId, body, groupId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all items for the entity with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully with stock status and counts',
    type: GetItemsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getItems(
    @Query() query: GetItemsQueryDto,
    @Req() req: Request,
  ): Promise<GetItemsResponseDto> {

    const entityId = getEffectiveEntityId(req);
    if (!entityId) {
      throw new BadRequestException('Entity ID is required');
    }

    return this.itemsService.getItems(entityId, query);
  }
}
