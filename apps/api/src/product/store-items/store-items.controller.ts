import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  private entity(req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return entityId;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one store item' })
  async getItem(@Param('id') id: string, @Req() req: Request) {
    return this.storeitemsService.getItem(id, this.entity(req));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a store item (stock changes go through inventory adjustments)' })
  async updateItem(
    @Param('id') id: string,
    @Body() body: Partial<CreateStoreItemDto>,
    @Req() req: Request,
  ) {
    return this.storeitemsService.updateItem(id, this.entity(req), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a store item' })
  async deleteItem(@Param('id') id: string, @Req() req: Request) {
    return this.storeitemsService.deleteItem(id, this.entity(req));
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload the item image shown on POS and the online store' })
  async setImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const groupId = getEffectiveGroupId(req) as string;
    return this.storeitemsService.setImage(id, this.entity(req), groupId, file);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Remove the item image' })
  async removeImage(@Param('id') id: string, @Req() req: Request) {
    return this.storeitemsService.removeImage(id, this.entity(req));
  }
}
