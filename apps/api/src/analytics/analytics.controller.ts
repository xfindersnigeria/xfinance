import {
  Controller,
  Get,
  Req,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { AnalyticsService } from './analytics.service';
import { DashboardResponseDto } from './dto/analytics-response.dto';
import { DateFilterEnum, DateFilterHelper } from './dto/date-filter.dto';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { systemRole } from 'prisma/generated/enums';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('/dashboard')
  @ApiOperation({
    summary: 'Get complete dashboard data with all metrics, charts, and aging reports with date filtering',
  })
  @ApiQuery({
    name: 'monthlyFilter',
    enum: DateFilterEnum,
    required: false,
    description: 'Filter for bar chart (monthly revenue & expenses)',
    example: 'THIS_YEAR',
  })
  @ApiQuery({
    name: 'cashFlowFilter',
    enum: DateFilterEnum,
    required: false,
    description: 'Filter for line chart (cash flow inflow vs outflow)',
    example: 'LAST_12_MONTHS',
  })
  @ApiQuery({
    name: 'expensesFilter',
    enum: DateFilterEnum,
    required: false,
    description: 'Filter for pie chart (top expenses by category)',
    example: 'THIS_YEAR',
  })
  @ApiOkResponse({
    description: 'Dashboard data with KPIs, revenue/expense breakdown, cash flow, and aging reports',
    type: DashboardResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getDashboardData(
    @Req() req: Request,
    @Query('monthlyFilter') monthlyFilter?: string,
    @Query('cashFlowFilter') cashFlowFilter?: string,
    @Query('expensesFilter') expensesFilter?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    console.log(req.user)
    if (!entityId) throw new BadRequestException('Entity ID is required');

    const monthly = (monthlyFilter as DateFilterEnum) || DateFilterEnum.THIS_YEAR;
    const cashFlow = (cashFlowFilter as DateFilterEnum) || DateFilterEnum.LAST_12_MONTHS;
    const expenses = (expensesFilter as DateFilterEnum) || DateFilterEnum.THIS_YEAR;

    return this.analyticsService.getDashboardData(entityId, monthly, cashFlow, expenses);
  }

  @Get('/kpis')
  @ApiOperation({
    summary: 'Get KPIs only (Revenue MTD, Bank Balance, Liabilities, Active Customers)',
  })
  @ApiOkResponse({
    description: 'Key performance indicators with month-over-month comparisons',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getKPIs(@Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.analyticsService.getKPIs(entityId);
  }

  @Get('/monthly-breakdown')
  @ApiOperation({
    summary: 'Get monthly revenue and expenses breakdown with date filtering',
  })
  @ApiQuery({
    name: 'filter',
    enum: DateFilterEnum,
    required: false,
    description: 'Date filter for the bar chart',
    example: 'THIS_YEAR',
  })
  @ApiOkResponse({
    description: 'Monthly revenue and expenses data for bar chart',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getMonthlyBreakdown(@Req() req: Request, @Query('filter') filter?: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    const dateFilter = (filter as DateFilterEnum) || DateFilterEnum.THIS_YEAR;
    return this.analyticsService.getMonthlyBreakdown(entityId, dateFilter);
  }

  @Get('/cash-flow')
  @ApiOperation({
    summary: 'Get cash flow data (Inflow vs Outflow by month) with date filtering',
  })
  @ApiQuery({
    name: 'filter',
    enum: DateFilterEnum,
    required: false,
    description: 'Date filter for the line chart',
    example: 'LAST_12_MONTHS',
  })
  @ApiOkResponse({
    description: 'Inflow and outflow data for line chart',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getCashFlow(@Req() req: Request, @Query('filter') filter?: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    const dateFilter = (filter as DateFilterEnum) || DateFilterEnum.LAST_12_MONTHS;
    return this.analyticsService.getCashFlow(entityId, dateFilter);
  }

  @Get('/expenses/by-category')
  @ApiOperation({
    summary: 'Get top expenses by category (for pie chart) with date filtering',
  })
  @ApiQuery({
    name: 'filter',
    enum: DateFilterEnum,
    required: false,
    description: 'Date filter for the pie chart',
    example: 'THIS_YEAR',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of categories to return (default: 10)',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Expenses breakdown by category with percentages for pie chart',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getExpensesByCategory(
    @Req() req: Request,
    @Query('filter') filter?: string,
    @Query('limit') limit: number = 10,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    const dateFilter = (filter as DateFilterEnum) || DateFilterEnum.THIS_YEAR;
    return this.analyticsService.getTopExpenses(entityId, dateFilter, limit);
  }

  @Get('/receivable-aging')
  @ApiOperation({
    summary: 'Get accounts receivable aging (0-30, 31-60, 61-90, 90+ days)',
  })
  @ApiOkResponse({
    description: 'Aging buckets for unpaid invoices',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getReceivableAging(@Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.analyticsService.getReceivableAging(entityId);
  }

  @Get('/payable-aging')
  @ApiOperation({
    summary: 'Get accounts payable aging (0-30, 31-60, 61-90, 90+ days)',
  })
  @ApiOkResponse({
    description: 'Aging buckets for unpaid bills',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getPayableAging(@Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.analyticsService.getPayableAging(entityId);
  }

  @Get('/recent-transactions')
  @ApiOperation({
    summary: 'Get recent transactions (latest activity)',
  })
  @ApiOkResponse({
    description: 'Recent account transactions',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getRecentTransactions(@Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.analyticsService.getRecentTransactions(entityId, 10);
  }

  @Get('/banking-summary')
  @ApiOperation({
    summary: 'Get banking summary (total cash + account count)',
  })
  @ApiOkResponse({
    description: 'Total bank cash balance, number of accounts, and account details',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getBankingSummary(@Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.analyticsService.getBankingSummary(entityId);
  }

  // ─── Group-scoped (admin dashboard) ──────────────────────────────────────

  @Get('group/dashboard')
  @ApiOperation({ summary: 'Get group-consolidated dashboard data (KPIs, monthly trend, entity performance)' })
  @ApiQuery({ name: 'filter', enum: DateFilterEnum, required: false, example: 'THIS_YEAR' })
  @ApiOkResponse({ description: 'Group consolidated dashboard data' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getGroupDashboard(@Req() req: Request, @Query('filter') filter?: string) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    const dateFilter = (filter as DateFilterEnum) || DateFilterEnum.THIS_YEAR;
    return this.analyticsService.getGroupDashboard(groupId, dateFilter);
  }

  @Get('superadmin/dashboard')
    @UseGuards(RolesGuard)
    @Roles(systemRole.superadmin)
    @ApiOperation({ summary: 'Get superadmin dashboard stats with all metrics' })
    @ApiResponse({ status: 200, description: 'Comprehensive dashboard statistics' })
    getDashboardStats() {
      return this.analyticsService.getDashboardStats();
    }
}
