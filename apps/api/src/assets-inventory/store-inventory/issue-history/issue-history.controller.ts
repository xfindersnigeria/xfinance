import { Controller, Post, Get, Patch, Delete, Param, Body, Req, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { IssueHistoryService } from './issue-history.service';
import { CreateIssueHistoryDto, BulkIssueHistoryDto, UpdateIssueHistoryDto, GetIssueHistoryQueryDto } from './issue-history.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { AuthGuard } from '@/auth/guards/auth.guard';



@UseGuards(AuthGuard)
@Controller('store-supply/issue-history')
export class IssueHistoryController {
  constructor(private readonly service: IssueHistoryService) {}

  @Post('single')
  async create(@Req() req, @Body() dto: CreateIssueHistoryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    dto.issuedById = req.user.id;
    const groupId = getEffectiveGroupId(req) as string;
    return this.service.create(dto, entityId, groupId);
  }

  @Post('bulk')
  async bulkCreate(@Req() req, @Body() dto: BulkIssueHistoryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    dto.issuedById = req.user.id;
    const groupId = getEffectiveGroupId(req) as string;
    return this.service.bulkCreate(dto, entityId, groupId);
  }

  @Get()
  async findAll(@Req() req, @Query() query: GetIssueHistoryQueryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.findAll(entityId, query);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.findOne(id, entityId);
  }

  @Patch(':id')
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateIssueHistoryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    dto.updatedById = req.user.id;
    return this.service.update(id, dto, entityId);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.service.remove(id, entityId);
  }
}
