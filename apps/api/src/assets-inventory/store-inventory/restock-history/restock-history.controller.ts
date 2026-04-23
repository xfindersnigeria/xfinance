import { Controller, Post, Get, Patch, Delete, Param, Body, Req, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { RestockHistoryService } from './restock-history.service';
import { CreateRestockHistoryDto, UpdateRestockHistoryDto } from './restock-history.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@UseGuards(AuthGuard)
@Controller('store-supply/restock-history')
export class RestockHistoryController {
  constructor(private readonly service: RestockHistoryService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateRestockHistoryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    const user = req.user;
    const restockedBy = user ? user?.id : 'Unknown';
    return this.service.create(dto, entityId, groupId, restockedBy);
  }

  @Get()
  async findAll(@Req() req: any, @Query() query: { page?: string; limit?: string; search?: string }) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.findAll(entityId, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      search: query.search,
    });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.findOne(id, entityId);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRestockHistoryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.update(id, dto, entityId);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.remove(id, entityId);
  }
}
