import {
  Controller, Post, Get, Patch, Delete, Param, Body, Req, HttpCode, HttpStatus, BadRequestException,
  UseGuards, Query
} from '@nestjs/common';
import { StoreInventoryService } from './store-inventory.service';
import { CreateStoreSupplyDto, UpdateStoreSupplyDto, GetStoreSuppliesQueryDto } from './store-inventory.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { ApiBearerAuth, ApiTags, ApiCookieAuth } from '@nestjs/swagger';



@ApiTags('Store Inventory')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('store-supply')
export class StoreInventoryController {
  constructor(private readonly service: StoreInventoryService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateStoreSupplyDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    return this.service.create(dto, entityId, groupId);
  }

  @Get()
  async findAll(@Req() req, @Query() query: GetStoreSuppliesQueryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.findAll(entityId, query);
  }

  @Get('stats')
  async stats(@Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.stats(entityId);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.findOne(id, entityId);
  }

  @Patch(':id')
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateStoreSupplyDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.update(id, dto, entityId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req, @Param('id') id: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    await this.service.remove(id, entityId);
    return;
  }

  // @Post('issue')
  // async issueSupply(@Req() req, @Body() dto: CreateSupplyIssueDto) {
  //   const entityId = getEffectiveEntityId(req);
  //   if (!entityId) throw new BadRequestException('Entity ID is required');
  //   return this.service.issueSupply(dto, entityId);
  // }
}
