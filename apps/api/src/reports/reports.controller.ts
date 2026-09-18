import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { ReportsService } from './reports.service';
import { ReportExportService } from './export/report-export.service';
import { ReportExportDto } from './export/report-export.dto';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportExportService: ReportExportService,
  ) {}

  @Post('export')
  @ApiOperation({ summary: 'Render a report table as a PDF or CSV download (shared by every entity and group report)' })
  @ApiQuery({ name: 'format', required: true, enum: ['pdf', 'csv'] })
  async exportReport(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: ReportExportDto,
    @Query('format') format: string,
  ) {
    if (format !== 'pdf' && format !== 'csv') throw new BadRequestException('format must be pdf or csv');
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (dto.scope === 'entity' && !entityId) throw new BadRequestException('Entity ID is required');
    if (dto.scope === 'group') {
      const role = (req.user as any)?.systemRole;
      if (role !== 'admin' && role !== 'superadmin') throw new ForbiddenException('Group reports are available to group admins only');
      if (!groupId) throw new BadRequestException('Group ID is required');
    }

    if (format === 'pdf') {
      const pdf = await this.reportExportService.toPdf(dto, { entityId, groupId });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${this.reportExportService.fileName(dto, 'pdf')}`);
      res.send(pdf);
      return;
    }
    const csv = this.reportExportService.toCsv(dto);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${this.reportExportService.fileName(dto, 'csv')}`);
    res.send(csv);
  }

  @Get('profit-and-loss')
  @ApiOperation({ summary: 'Get Profit & Loss statement for a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-03-31' })
  @ApiQuery({ name: 'compareStartDate', required: false, example: '2024-10-01' })
  @ApiQuery({ name: 'compareEndDate', required: false, example: '2024-12-31' })
  async getProfitAndLoss(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const compareStart = compareStartDate ? new Date(compareStartDate) : undefined;
    const compareEnd = compareEndDate ? new Date(compareEndDate) : undefined;
    if (compareEnd) compareEnd.setHours(23, 59, 59, 999);

    const data = await this.reportsService.getProfitAndLoss(
      entityId,
      start,
      end,
      compareStart,
      compareEnd,
    );

    return { data, message: 'Profit & Loss report generated', statusCode: 200 };
  }

  @Get('cash-flow-statement')
  @ApiOperation({ summary: 'Get Cash Flow Statement for a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-03-31' })
  @ApiQuery({ name: 'compareStartDate', required: false, example: '2024-10-01' })
  @ApiQuery({ name: 'compareEndDate', required: false, example: '2024-12-31' })
  async getCashFlowStatement(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const compareStart = compareStartDate ? new Date(compareStartDate) : undefined;
    const compareEnd = compareEndDate ? new Date(compareEndDate) : undefined;
    if (compareEnd) compareEnd.setHours(23, 59, 59, 999);

    const data = await this.reportsService.getCashFlowStatement(
      entityId,
      start,
      end,
      compareStart,
      compareEnd,
    );

    return { data, message: 'Cash Flow Statement generated', statusCode: 200 };
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get Trial Balance for a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-01-31' })
  async getTrialBalance(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const data = await this.reportsService.getTrialBalance(entityId, start, end);
    return { data, message: 'Trial Balance generated', statusCode: 200 };
  }

  // ─── Balance Sheet ────────────────────────────────────────────────────────────

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get Balance Sheet as of a date' })
  @ApiQuery({ name: 'asOfDate', required: true, example: '2025-03-31' })
  @ApiQuery({ name: 'compareAsOfDate', required: false, example: '2024-12-31' })
  async getBalanceSheet(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
    @Query('compareAsOfDate') compareAsOfDate?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!asOfDate) throw new BadRequestException('asOfDate is required');
    const d = new Date(asOfDate);
    d.setHours(23, 59, 59, 999);
    if (isNaN(d.getTime())) throw new BadRequestException('Invalid asOfDate');
    const compareD = compareAsOfDate ? new Date(compareAsOfDate) : undefined;
    if (compareD) compareD.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getBalanceSheet(entityId, d, compareD);
    return { data, message: 'Balance Sheet generated', statusCode: 200 };
  }

  // ─── Business Performance Ratios ─────────────────────────────────────────────

  @Get('performance-ratios')
  @ApiOperation({ summary: 'Get business performance ratios for a period' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getPerformanceRatios(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getPerformanceRatios(entityId, start, end);
    return { data, message: 'Performance Ratios generated', statusCode: 200 };
  }

  // ─── Sales by Customer ────────────────────────────────────────────────────────

  @Get('sales-by-customer')
  @ApiOperation({ summary: 'Get sales grouped by customer' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getSalesByCustomer(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getSalesByCustomer(entityId, start, end);
    return { data, message: 'Sales by Customer report generated', statusCode: 200 };
  }

  // ─── Sales by Item ────────────────────────────────────────────────────────────

  @Get('sales-by-item')
  @ApiOperation({ summary: 'Get sales grouped by item/product' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getSalesByItem(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getSalesByItem(entityId, start, end);
    return { data, message: 'Sales by Item report generated', statusCode: 200 };
  }

  // ─── Invoice Details ──────────────────────────────────────────────────────────

  @Get('invoice-details')
  @ApiOperation({ summary: 'Get invoice details listing' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  async getInvoiceDetails(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getInvoiceDetails(entityId, start, end, status, customerId);
    return { data, message: 'Invoice Details report generated', statusCode: 200 };
  }

  // ─── Receivable Summary ───────────────────────────────────────────────────────

  @Get('receivable-summary')
  @ApiOperation({ summary: 'Get outstanding receivables summary as of a date' })
  @ApiQuery({ name: 'asOfDate', required: true })
  async getReceivableSummary(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!asOfDate) throw new BadRequestException('asOfDate is required');
    const d = new Date(asOfDate);
    d.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getReceivableSummary(entityId, d);
    return { data, message: 'Receivable Summary generated', statusCode: 200 };
  }

  // ─── Aged Receivables ─────────────────────────────────────────────────────────

  @Get('aged-receivables')
  @ApiOperation({ summary: 'Get aged receivables by customer' })
  @ApiQuery({ name: 'asOfDate', required: true })
  async getAgedReceivables(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!asOfDate) throw new BadRequestException('asOfDate is required');
    const d = new Date(asOfDate);
    d.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getAgedReceivables(entityId, d);
    return { data, message: 'Aged Receivables generated', statusCode: 200 };
  }

  // ─── Customer Balances ────────────────────────────────────────────────────────

  @Get('customer-balances')
  @ApiOperation({ summary: 'Get balance per customer for a period' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getCustomerBalances(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getCustomerBalances(entityId, start, end);
    return { data, message: 'Customer Balances generated', statusCode: 200 };
  }

  // ─── Payment Method Summary ───────────────────────────────────────────────────

  @Get('payment-method-summary')
  @ApiOperation({ summary: 'Get payments received grouped by method' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getPaymentMethodSummary(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getPaymentMethodSummary(entityId, start, end);
    return { data, message: 'Payment Method Summary generated', statusCode: 200 };
  }

  // ─── Payable Summary ──────────────────────────────────────────────────────────

  @Get('payable-summary')
  @ApiOperation({ summary: 'Get outstanding payables summary as of a date' })
  @ApiQuery({ name: 'asOfDate', required: true })
  async getPayableSummary(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!asOfDate) throw new BadRequestException('asOfDate is required');
    const d = new Date(asOfDate);
    d.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getPayableSummary(entityId, d);
    return { data, message: 'Payable Summary generated', statusCode: 200 };
  }

  // ─── Aged Payables ────────────────────────────────────────────────────────────

  @Get('aged-payables')
  @ApiOperation({ summary: 'Get aged payables by vendor' })
  @ApiQuery({ name: 'asOfDate', required: true })
  async getAgedPayables(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!asOfDate) throw new BadRequestException('asOfDate is required');
    const d = new Date(asOfDate);
    d.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getAgedPayables(entityId, d);
    return { data, message: 'Aged Payables generated', statusCode: 200 };
  }

  // ─── Vendor Balances ──────────────────────────────────────────────────────────

  @Get('vendor-balances')
  @ApiOperation({ summary: 'Get balance per vendor for a period' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getVendorBalances(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getVendorBalances(entityId, start, end);
    return { data, message: 'Vendor Balances generated', statusCode: 200 };
  }

  // ─── Expense by Category ──────────────────────────────────────────────────────

  @Get('expense-by-category')
  @ApiOperation({ summary: 'Get expenses grouped by account category' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getExpenseByCategory(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getExpenseByCategory(entityId, start, end);
    return { data, message: 'Expense by Category report generated', statusCode: 200 };
  }

  // ─── Expense by Vendor ────────────────────────────────────────────────────────

  @Get('expense-by-vendor')
  @ApiOperation({ summary: 'Get expenses grouped by vendor' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getExpenseByVendor(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getExpenseByVendor(entityId, start, end);
    return { data, message: 'Expense by Vendor report generated', statusCode: 200 };
  }

  // ─── Bill Details ─────────────────────────────────────────────────────────────

  @Get('bill-details')
  @ApiOperation({ summary: 'Get bill details listing' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  async getBillDetails(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getBillDetails(entityId, start, end, status, vendorId);
    return { data, message: 'Bill Details report generated', statusCode: 200 };
  }

  // ─── Bank Reconciliation Summary ─────────────────────────────────────────────

  @Get('bank-reconciliation-summary')
  @ApiOperation({ summary: 'Get bank reconciliation summary for a period' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getBankReconciliationSummary(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getBankReconciliationSummary(entityId, start, end);
    return { data, message: 'Bank Reconciliation Summary generated', statusCode: 200 };
  }

  // ─── Bank Account Transactions ────────────────────────────────────────────────

  @Get('bank-account-transactions')
  @ApiOperation({ summary: 'Get bank account transactions for a period' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'bankAccountId', required: false })
  async getBankAccountTransactions(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('bankAccountId') bankAccountId?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getBankAccountTransactions(entityId, start, end, bankAccountId);
    return { data, message: 'Bank Account Transactions report generated', statusCode: 200 };
  }

  // ─── Supplies Inventory Report ────────────────────────────────────────────────

  @Get('supplies-inventory')
  @ApiOperation({ summary: 'Get current supplies inventory status' })
  async getSuppliesInventory(@Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const data = await this.reportsService.getSuppliesInventory(entityId);
    return { data, message: 'Supplies Inventory report generated', statusCode: 200 };
  }

  // ─── Supplies Consumption by Department ──────────────────────────────────────

  @Get('supplies-consumption-by-department')
  @ApiOperation({ summary: 'Get supplies consumption grouped by department' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getSuppliesConsumptionByDept(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getSuppliesConsumptionByDepartment(entityId, start, end);
    return { data, message: 'Supplies Consumption by Department report generated', statusCode: 200 };
  }

  // ─── Supplies Consumption by Project ─────────────────────────────────────────

  @Get('supplies-consumption-by-project')
  @ApiOperation({ summary: 'Get supplies consumption grouped by project' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getSuppliesConsumptionByProject(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const data = await this.reportsService.getSuppliesConsumptionByProject(entityId, start, end);
    return { data, message: 'Supplies Consumption by Project report generated', statusCode: 200 };
  }

  // ─── Cash Flow Forecasting ───────────────────────────────────────────────────

  @Get('cash-flow-forecasting')
  @ApiOperation({ summary: 'Forecast cash position month by month from open invoices/bills and recent run-rates' })
  @ApiQuery({ name: 'months', required: false, example: 6 })
  @ApiQuery({ name: 'asOfDate', required: false, example: '2026-09-18' })
  async getCashFlowForecast(
    @Req() req: Request,
    @Query('months') months?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    if (isNaN(asOf.getTime())) throw new BadRequestException('Invalid asOfDate');
    asOf.setHours(23, 59, 59, 999);
    const n = months ? Number(months) : 6;
    if (!Number.isFinite(n) || n < 1 || n > 24) throw new BadRequestException('months must be between 1 and 24');
    const data = await this.reportsService.getCashFlowForecast(entityId, n, asOf);
    return { data, message: 'Cash Flow Forecast generated', statusCode: 200 };
  }

  // ─── Movement of Equity ──────────────────────────────────────────────────────

  @Get('movement-of-equity')
  @ApiOperation({ summary: 'Statement of changes in equity for a date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getMovementOfEquity(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const { start, end } = this.parseRange(startDate, endDate);
    const data = await this.reportsService.getMovementOfEquity(entityId, start, end);
    return { data, message: 'Movement of Equity report generated', statusCode: 200 };
  }

  // ─── Sales Tax Summary ───────────────────────────────────────────────────────

  @Get('sales-tax-summary')
  @ApiOperation({ summary: 'Output vs input VAT from invoices, receipts, bills and expenses' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getSalesTaxSummary(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const { start, end } = this.parseRange(startDate, endDate);
    const data = await this.reportsService.getSalesTaxSummary(entityId, start, end);
    return { data, message: 'Sales Tax Summary generated', statusCode: 200 };
  }

  // ─── Tax Liability Report ────────────────────────────────────────────────────

  @Get('tax-liability-report')
  @ApiOperation({ summary: 'Tax liabilities (VAT, PAYE, pension, NHF, NHIS…) from ledger balances' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getTaxLiabilityReport(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const { start, end } = this.parseRange(startDate, endDate);
    const data = await this.reportsService.getTaxLiabilityReport(entityId, start, end);
    return { data, message: 'Tax Liability report generated', statusCode: 200 };
  }

  private parseRange(startDate: string, endDate: string) {
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Invalid date format');
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}
