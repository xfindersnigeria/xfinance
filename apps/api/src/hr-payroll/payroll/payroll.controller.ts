import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import {
  CreatePayrollBatchDto,
  ChangePayrollStatusDto,
  UpdatePayrollBatchDto,
  PreviewDeductionDto,
  MarkPayrollPaidDto,
} from './dto/payroll.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import {
  getEffectiveEntityId,
  getEffectiveGroupId,
} from '@/auth/utils/context.util';
import { PdfService } from '@/pdf/pdf.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Response } from 'express';

const DEFAULT_PRIMARY = '#4152B6';

@Controller('hr-payroll/payroll')
@UseGuards(AuthGuard)
export class PayrollController {
  constructor(
    private payrollService: PayrollService,
    private pdfService: PdfService,
    private prisma: PrismaService,
  ) {}

  private async getPrimaryColor(groupId: string): Promise<string> {
    const c = await this.prisma.groupCustomization.findUnique({ where: { groupId }, select: { primaryColor: true } });
    return c?.primaryColor ?? DEFAULT_PRIMARY;
  }

  @Get('prefill')
  getPrefill(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getPrefillData(entityId);
  }

  @Post('preview-deduction')
  previewDeduction(@Body() dto: PreviewDeductionDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.previewDeduction(
      entityId,
      dto.employeeId,
      dto.basicSalary,
      dto.allowances ?? 0,
      dto.bonus ?? 0,
      dto.overtime ?? 0,
    );
  }

  @Post()
  create(@Body() dto: CreatePayrollBatchDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    const userId = req.user?.id ?? '';
    return this.payrollService.createBatch(dto, entityId, groupId, userId);
  }

  @Get()
  getBatches(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getBatches(entityId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      status,
    });
  }

  @Get('records')
  getRecords(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getRecords(entityId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
    });
  }

  @Get('records/:id')
  getRecord(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getRecord(id, entityId);
  }

  @Get('records/:id/pdf')
  async downloadPayslip(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied no entityId');
    const groupId = getEffectiveGroupId(req);
    const [{ data: record }, primaryColor] = await Promise.all([
      this.payrollService.getRecord(id, entityId),
      groupId ? this.getPrimaryColor(groupId) : Promise.resolve(DEFAULT_PRIMARY),
    ]);


    const recordData = { ...record, deductionsTotal: (record.statutoryDed ?? 0) + (record.otherDed ?? 0) };
    const pdfBuffer = await this.pdfService.generate('payslip', { record: recordData, primaryColor });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payslip-${record.employee.employeeId ?? id}.pdf`,
    );
    res.send(pdfBuffer);
  }

  // NOTE: static routes like 'paye-report' must be registered before the
  // dynamic ':id' routes below — NestJS/Express matches routes in
  // declaration order, so ':id' would otherwise swallow '/paye-report' as
  // id="paye-report" and 404.
  @Get('paye-report')
  async getPayeReport(
    @Req() req: any,
    @Query('year') year?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getPayeReport(entityId, year ? Number(year) : undefined);
  }

  @Get('paye-report/csv')
  async exportPayeReportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const { data } = await this.payrollService.getPayeReport(entityId, targetYear);
    const { employees, allowableDeductionNames, taxBands } = data;

    const bandHeaders = taxBands.map((b: any) => {
      if (b.to == null) return `Excess@${b.rate}%`;
      const fromM = b.from / 1000000;
      const rangeM = (b.to - b.from) / 1000000;
      return fromM === 0 ? `${b.to / 1000}k@${b.rate}%` : `${rangeM}M@${b.rate}%`;
    });

    const headers = [
      'S/N', 'Employee Name', 'TIN', 'FCT Taxpayer ID', 'Annual Gross',
      'Annual Rent', ...allowableDeductionNames, 'Rent Relief',
      'Total Deductions', 'Chargeable Income',
      ...bandHeaders,
      'Annual Tax Due', 'Monthly Tax Due', 'Remittance Status',
    ];

    const rows = employees.map((emp: any) => {
      const dedAmounts = allowableDeductionNames.map((name: string) => {
        const found = emp.deductionLines.find((d: any) => d.name === name);
        return found?.amount ?? 0;
      });
      const bandAmounts = taxBands.map((b: any) => {
        const found = emp.taxBandBreakdown.find((bd: any) => bd.rate === b.rate && bd.from === b.from);
        return found?.amount ?? 0;
      });
      return [
        emp.sn, emp.name, emp.tin, emp.fctTaxpayerId, emp.annualGross,
        emp.annualRentPaid, ...dedAmounts, emp.rentRelief,
        emp.totalAllowable, emp.chargeableIncome,
        ...bandAmounts,
        emp.annualTax, emp.monthlyTax, emp.remittanceStatus,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=PAYE_Computation_${targetYear}.csv`);
    res.send(csv);
  }

  @Get(':id')
  getBatch(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getBatch(id, entityId);
  }

  @Get(':id/pdf')
  async downloadBatchPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req);
    const [{ data: batch }, primaryColor] = await Promise.all([
      this.payrollService.getBatch(id, entityId),
      groupId ? this.getPrimaryColor(groupId) : Promise.resolve(DEFAULT_PRIMARY),
    ]);
    const pdfBuffer = await this.pdfService.generate('payroll-batch', {
      batch,
      primaryColor,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payroll-batch-${batch.batchName.replace(/\s+/g, '-')}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Get(':id/csv')
  async exportBatchCsv(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const { data: batch } = await this.payrollService.getBatch(id, entityId);
    const headers = [
      'Employee ID',
      'Name',
      'Role',
      'Department',
      'Basic Salary',
      'Allowances',
      'Bonus',
      'Overtime',
      'Gross Pay',
      'Statutory Deductions',
      'Other Deductions',
      'Net Pay',
    ];
    const rows = (batch.records || []).map((r: any) => [
      r.employee?.employeeId ?? '',
      `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.trim(),
      r.employee?.position ?? '',
      r.employee?.dept?.name ?? '',
      r.basicSalary,
      r.allowances,
      r.bonus,
      r.overtime,
      r.grossPay,
      r.statutoryDed,
      r.otherDed,
      r.netPay,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payroll-batch-${batch.batchName.replace(/\s+/g, '-')}.csv`,
    );
    res.send(csv);
  }

  @Patch(':id')
  updateBatch(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollBatchDto,
    @Req() req: any,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.updateBatch(id, dto, entityId);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangePayrollStatusDto,
    @Req() req: any,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req) ?? '';
    const userId = req.user?.id ?? null;
    return this.payrollService.changeStatus(id, dto.status, entityId, groupId, userId);
  }

  @Patch(':id/post')
  postToLedger(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req) ?? '';
    return this.payrollService.postToLedger(id, entityId, groupId);
  }

  @Patch(':id/mark-paid')
  markAsPaid(
    @Param('id') id: string,
    @Body() dto: MarkPayrollPaidDto,
    @Req() req: any,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req) ?? '';
    const userId = req.user?.id ?? null;
    return this.payrollService.markAsPaid(id, entityId, groupId, dto.cashAccountId, userId);
  }

  @Delete(':id')
  deleteBatch(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.deleteBatch(id, entityId);
  }
}
