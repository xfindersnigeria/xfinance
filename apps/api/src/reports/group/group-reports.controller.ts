import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { systemRole } from 'prisma/generated/enums';
import { getEffectiveGroupId } from '@/auth/utils/context.util';
import { GroupReportsService } from './group-reports.service';

function parseDate(value: string | undefined, name: string, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new BadRequestException(`Invalid ${name}`);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

function requireRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
  return { start: parseDate(startDate, 'startDate')!, end: parseDate(endDate, 'endDate', true)! };
}

/**
 * Group (consolidated) reports — every entity in the caller's group, converted
 * to the group base currency. Group admins and superadmins only: these expose
 * every entity's financials.
 */
@ApiTags('Group Reports')
@Controller('reports/group')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class GroupReportsController {
  constructor(private readonly groupReportsService: GroupReportsService) {}

  private groupId(req: Request): string {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return groupId;
  }

  @Get('context')
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Group base currency, entities with their conversion rates, and currency warnings' })
  async getContext(@Req() req: Request) {
    const data = await this.groupReportsService.getContext(this.groupId(req));
    return { data, message: 'Group report context', statusCode: 200 };
  }

  @Get('profit-and-loss')
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Consolidated Profit & Loss with per-entity breakdown' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'compareStartDate', required: false })
  @ApiQuery({ name: 'compareEndDate', required: false })
  async getProfitAndLoss(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const { start, end } = requireRange(startDate, endDate);
    const data = await this.groupReportsService.getConsolidatedProfitAndLoss(
      this.groupId(req),
      start,
      end,
      parseDate(compareStartDate, 'compareStartDate'),
      parseDate(compareEndDate, 'compareEndDate', true),
    );
    return { data, message: 'Consolidated Profit & Loss generated', statusCode: 200 };
  }

  @Get('balance-sheet')
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Consolidated Balance Sheet (also backs Consolidated Financial Position)' })
  @ApiQuery({ name: 'asOfDate', required: true })
  @ApiQuery({ name: 'compareAsOfDate', required: false })
  async getBalanceSheet(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
    @Query('compareAsOfDate') compareAsOfDate?: string,
  ) {
    if (!asOfDate) throw new BadRequestException('asOfDate is required');
    const data = await this.groupReportsService.getConsolidatedBalanceSheet(
      this.groupId(req),
      parseDate(asOfDate, 'asOfDate', true)!,
      parseDate(compareAsOfDate, 'compareAsOfDate', true),
    );
    return { data, message: 'Consolidated Balance Sheet generated', statusCode: 200 };
  }

  @Get('cash-flow-statement')
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Consolidated Cash Flow Statement with per-entity breakdown' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'compareStartDate', required: false })
  @ApiQuery({ name: 'compareEndDate', required: false })
  async getCashFlow(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const { start, end } = requireRange(startDate, endDate);
    const data = await this.groupReportsService.getConsolidatedCashFlow(
      this.groupId(req),
      start,
      end,
      parseDate(compareStartDate, 'compareStartDate'),
      parseDate(compareEndDate, 'compareEndDate', true),
    );
    return { data, message: 'Consolidated Cash Flow Statement generated', statusCode: 200 };
  }

  @Get('cash-flow-forecast')
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Group cash flow forecast — every entity forecast converted and summed' })
  @ApiQuery({ name: 'months', required: false, example: 12 })
  @ApiQuery({ name: 'asOfDate', required: false })
  async getCashFlowForecast(
    @Req() req: Request,
    @Query('months') months?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const horizon = months ? Number(months) : 12;
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 24) {
      throw new BadRequestException('months must be a whole number between 1 and 24');
    }
    const data = await this.groupReportsService.getGroupCashFlowForecast(
      this.groupId(req),
      horizon,
      parseDate(asOfDate, 'asOfDate') ?? new Date(),
    );
    return { data, message: 'Group cash flow forecast generated', statusCode: 200 };
  }

  @Get('entity-comparison')
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Per-entity revenue, expense and profitability metrics with a 12-month trend' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'compareStartDate', required: false })
  @ApiQuery({ name: 'compareEndDate', required: false })
  async getEntityComparison(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const { start, end } = requireRange(startDate, endDate);
    const data = await this.groupReportsService.getEntityComparison(
      this.groupId(req),
      start,
      end,
      parseDate(compareStartDate, 'compareStartDate'),
      parseDate(compareEndDate, 'compareEndDate', true),
    );
    return { data, message: 'Entity comparison generated', statusCode: 200 };
  }
}
