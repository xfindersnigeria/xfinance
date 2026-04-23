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
} from './dto/payroll.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import {
  getEffectiveEntityId,
  getEffectiveGroupId,
} from '@/auth/utils/context.util';
import { PdfService } from '@/pdf/pdf.service';
import { Response } from 'express';

@Controller('hr-payroll/payroll')
@UseGuards(AuthGuard)
export class PayrollController {
  constructor(
    private payrollService: PayrollService,
    private pdfService: PdfService,
  ) {}

  @Get('prefill')
  getPrefill(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.getPrefillData(entityId);
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
    const { data: record } = await this.payrollService.getRecord(id, entityId);

    const pdfBuffer = await this.pdfService.generate('payslip', { record });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payslip-${record.employee.employeeId ?? id}.pdf`,
    );
    res.send(pdfBuffer);
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
    const { data: batch } = await this.payrollService.getBatch(id, entityId);
    const pdfBuffer = await this.pdfService.generate('payroll-batch', {
      batch,
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
    const userId = req.user?.id ?? null;
    return this.payrollService.changeStatus(id, dto.status, entityId, userId);
  }

  @Delete(':id')
  deleteBatch(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.payrollService.deleteBatch(id, entityId);
  }
}
