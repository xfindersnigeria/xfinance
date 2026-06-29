import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBulkBudgetDto, UpdateBulkBudgetDto } from './dto/budget.dto';
import {
  getEffectiveEntityId,
  getEffectiveGroupId,
} from '@/auth/utils/context.util';
import { Request } from 'express';
import { AuthGuard } from '@/auth/guards/auth.guard';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Budget')
@Controller('budget')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // ── Entity budget endpoints ────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a budget (header + lines)' })
  async create(@Body() dto: CreateBulkBudgetDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.createBulkBudgets(entityId, dto, groupId);
  }

  @Get('vs-actual')
  @ApiOperation({ summary: 'Budget vs Actual comparison for a period' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  async getBudgetVsActual(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('period') period?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.budgetService.getBudgetVsActual(entityId, { periodType, period, fiscalYear });
  }

  @Get('previous-period')
  @ApiOperation({ summary: 'Get budget lines from the previous period' })
  @ApiQuery({ name: 'periodType', required: true })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: true })
  async getPreviousPeriod(
    @Req() req: Request,
    @Query('periodType') periodType: string,
    @Query('period') period: string,
    @Query('fiscalYear') fiscalYear: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!periodType || !fiscalYear)
      throw new BadRequestException('periodType and fiscalYear are required');
    return this.budgetService.getPreviousPeriod(entityId, { periodType, period: period ?? '', fiscalYear });
  }

  @Get()
  @ApiOperation({ summary: 'List budget headers for the entity' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.budgetService.findAllHeaders(entityId, {
      periodType,
      fiscalYear,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget header with all its lines' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.budgetService.getBudgetHeader(id, entityId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a budget header and replace its lines' })
  async update(@Param('id') id: string, @Body() dto: UpdateBulkBudgetDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.updateBudgetHeader(id, dto, entityId, groupId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget (header + all its lines)' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.budgetService.deleteBudgetHeader(id, entityId);
  }

  // ── Group budget endpoints ─────────────────────────────────────────────────

  @Post('group')
  @ApiOperation({ summary: 'Create a group budget (header + lines)' })
  async createGroup(@Body() dto: CreateBulkBudgetDto, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.createGroupBulkBudgets(groupId, dto);
  }

  @Get('group/vs-actual')
  @ApiOperation({ summary: 'Group Budget vs Actual comparison for a period' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  async getGroupBudgetVsActual(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('period') period?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.getGroupBudgetVsActual(groupId, { periodType, period, fiscalYear });
  }

  @Get('group/previous-period')
  @ApiOperation({ summary: 'Get group budget lines from the previous period' })
  @ApiQuery({ name: 'periodType', required: true })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: true })
  async getGroupPreviousPeriod(
    @Req() req: Request,
    @Query('periodType') periodType: string,
    @Query('period') period: string,
    @Query('fiscalYear') fiscalYear: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    if (!periodType || !fiscalYear)
      throw new BadRequestException('periodType and fiscalYear are required');
    return this.budgetService.getGroupPreviousPeriod(groupId, { periodType, period: period ?? '', fiscalYear });
  }

  @Get('group/sub-categories')
  @ApiOperation({ summary: 'Get all account sub-categories for the group (for group budget/forecast form)' })
  async getGroupSubCategories(@Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.getGroupSubCategories(groupId);
  }

  @Get('group/accounts')
  @ApiOperation({ summary: 'Get all accounts for the group (for group budget form)' })
  async getGroupAccounts(@Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.getGroupAccounts(groupId);
  }

  @Get('group')
  @ApiOperation({ summary: 'List group budget headers' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllGroup(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.findAllGroupHeaders(groupId, {
      periodType,
      fiscalYear,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('group/:id')
  @ApiOperation({ summary: 'Get a group budget header with all its lines' })
  async findOneGroup(@Param('id') id: string, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.getGroupBudgetHeader(id, groupId);
  }

  @Put('group/:id')
  @ApiOperation({ summary: 'Update a group budget header and replace its lines' })
  async updateGroup(@Param('id') id: string, @Body() dto: UpdateBulkBudgetDto, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.updateGroupBudgetHeader(id, dto, groupId);
  }

  @Delete('group/:id')
  @ApiOperation({ summary: 'Delete a group budget (header + all its lines)' })
  async deleteGroup(@Param('id') id: string, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.deleteGroupBudgetHeader(id, groupId);
  }
}
