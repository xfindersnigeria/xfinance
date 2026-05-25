import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBulkBudgetDto } from './dto/budget.dto';
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

  @Post()
  @ApiOperation({ summary: 'Create or replace budget lines for a period' })
  async create(@Body() dto: CreateBulkBudgetDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.createBulkBudgets(entityId, dto, groupId);
  }

  /** Must come before /:id to avoid "vs-actual" being parsed as an id param */
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
    return this.budgetService.getBudgetVsActual(entityId, {
      periodType,
      period,
      fiscalYear,
    });
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
    return this.budgetService.getPreviousPeriod(entityId, {
      periodType,
      period: period ?? '',
      fiscalYear,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List budgets for the entity' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('period') period?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.budgetService.findAll(entityId, {
      periodType,
      period,
      fiscalYear,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget line by id' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.budgetService.deleteBudget(id, entityId);
  }

  // ── Group-scoped routes (must be before :id to avoid parsing as id param) ──

  @Post('group')
  @ApiOperation({ summary: 'Create or replace group budget lines for a period' })
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
    return this.budgetService.getGroupBudgetVsActual(groupId, {
      periodType,
      period,
      fiscalYear,
    });
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
    return this.budgetService.getGroupPreviousPeriod(groupId, {
      periodType,
      period: period ?? '',
      fiscalYear,
    });
  }

  @Get('group')
  @ApiOperation({ summary: 'List group budgets' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllGroup(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('period') period?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.findAllGroup(groupId, {
      periodType,
      period,
      fiscalYear,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Delete('group/:id')
  @ApiOperation({ summary: 'Delete a group budget line by id' })
  async deleteGroup(@Param('id') id: string, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.budgetService.deleteGroupBudget(id, groupId);
  }
}
