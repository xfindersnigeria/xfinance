import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePayrollBatchDto, PayrollStatus, UpdatePayrollBatchDto } from './dto/payroll.dto';
import { BullmqService } from '@/bullmq/bullmq.service';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private bullmqService: BullmqService,
  ) {}

  /** Compute individual deduction amounts for a single payroll record snapshot. */
  private buildDeductionBreakdown(
    basicSalary: number,
    grossPay: number,
    statutoryDeductions: any[],
    otherDeductions: any[],
  ) {
    const annualGross = grossPay * 12;

    const statutory = statutoryDeductions.map((d) => {
      let amount = 0;
      if (d.type === 'PERCENTAGE' && d.rate != null) {
        amount = (d.rate / 100) * grossPay;
      } else if (d.type === 'FIXED_AMOUNT' && d.fixedAmount != null) {
        if (!d.minAmount || grossPay >= d.minAmount) amount = d.fixedAmount;
      } else if (d.type === 'TIERED' && d.tiers?.length) {
        const annualTax = d.tiers.reduce((tax: number, tier: any) => {
          const upper = tier.to ?? Infinity;
          const bracketIncome = Math.min(annualGross, upper) - tier.from;
          if (bracketIncome <= 0) return tax;
          return tax + bracketIncome * (tier.rate / 100);
        }, 0);
        amount = annualTax / 12;
      }
      return { id: d.id, name: d.name, type: d.type, amount: Math.round(amount * 100) / 100 };
    });

    const other = otherDeductions.map((d) => {
      let amount = 0;
      if (d.type === 'PERCENTAGE' && d.rate != null) amount = (d.rate / 100) * grossPay;
      else if (d.type === 'FIXED_AMOUNT' && d.rate != null) amount = d.rate;
      return { id: d.id, name: d.name, amount: Math.round(amount * 100) / 100 };
    });

    return { statutory, other };
  }

  /** Frequency multiplier for annualising monthly/weekly salary. */
  private frequencyMultiplier(freq?: string | null): number {
    switch ((freq ?? '').toLowerCase()) {
      case 'weekly': return 52;
      case 'bi-weekly': return 26;
      case 'annually': return 1;
      default: return 12;
    }
  }

  /**
   * Return all active employees with prefilled salary data + suggested deductions
   * from entity's statutory and other deduction settings.
   */
  async getPrefillData(entityId: string) {
    const [employees, statutoryDeductions, otherDeductions] = await Promise.all([
      this.prisma.employee.findMany({
        where: { entityId, status: 'Active' },
        select: {
          id: true, firstName: true, lastName: true, position: true,
          salary: true, allowances: true, currency: true, departmentId: true,
          dept: { select: { name: true } },
        },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.statutoryDeduction.findMany({
        where: { entityId, status: 'active' },
        select: { type: true, rate: true, fixedAmount: true, minAmount: true, tiers: { orderBy: { from: 'asc' } } },
      }),
      this.prisma.otherDeduction.findMany({
        where: { entityId, status: 'active' },
        select: { type: true, rate: true },
      }),
    ]);

    const employeesWithSuggestions = employees.map((emp) => {
      const salary = emp.salary ?? 0;
      const allowances = emp.allowances ?? 0;

      const suggestedStatutoryDed = statutoryDeductions.reduce((sum, d) => {
        if (d.type === 'PERCENTAGE' && d.rate) {
          return sum + (d.rate / 100) * salary;
        }
        if (d.type === 'FIXED_AMOUNT' && d.fixedAmount) {
          // Only apply if salary meets the minimum threshold (if set)
          if (d.minAmount && salary < d.minAmount) return sum;
          return sum + d.fixedAmount;
        }
        if (d.type === 'TIERED' && d.tiers?.length) {
          const tierTax = d.tiers.reduce((tax, tier) => {
            const upper = tier.to ?? Infinity;
            const bracketAmount = Math.min(salary, upper) - tier.from;
            if (bracketAmount <= 0) return tax;
            return tax + bracketAmount * (tier.rate / 100);
          }, 0);
          return sum + tierTax;
        }
        return sum;
      }, 0);

      const suggestedOtherDed = otherDeductions.reduce((sum, d) => {
        if (d.type === 'PERCENTAGE' && d.rate) return sum + (d.rate / 100) * salary;
        if (d.type === 'FIXED_AMOUNT' && d.rate) return sum + d.rate;
        return sum;
      }, 0);

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        department: emp.dept?.name ?? '',
        salary,
        allowances,
        currency: emp.currency,
        suggestedStatutoryDed: Math.round(suggestedStatutoryDed * 100) / 100,
        suggestedOtherDed: Math.round(suggestedOtherDed * 100) / 100,
      };
    });

    return { data: employeesWithSuggestions };
  }

  /**
   * Create a payroll batch with records for all selected employees.
   */
  async createBatch(dto: CreatePayrollBatchDto, entityId: string, groupId: string, createdById: string) {
    try {
      const [statutoryDeductions, otherDeductions] = await Promise.all([
        this.prisma.statutoryDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, tiers: { orderBy: { from: 'asc' } } },
        }),
        this.prisma.otherDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true },
        }),
      ]);

      const records = dto.employees.map((emp) => {
        const basicSalary = emp.basicSalary;
        const allowances = emp.allowances ?? 0;
        const bonus = emp.bonus ?? 0;
        const overtime = emp.overtime ?? 0;
        const statutoryDed = emp.statutoryDed ?? 0;
        const otherDed = emp.otherDed ?? 0;
        const grossPay = basicSalary + allowances + bonus + overtime;
        const netPay = grossPay - statutoryDed - otherDed;
        const deductionBreakdown = this.buildDeductionBreakdown(basicSalary, grossPay, statutoryDeductions, otherDeductions);
        return { employeeId: emp.employeeId, basicSalary, allowances, bonus, overtime, statutoryDed, otherDed, grossPay, netPay, deductionBreakdown, entityId, groupId };
      });

      const totalAmount = records.reduce((s, r) => s + r.netPay, 0);

      const batch = await this.prisma.payrollBatch.create({
        data: {
          batchName: dto.batchName,
          period: dto.period,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          status: dto.status ?? 'Draft',
          totalAmount,
          totalEmployees: records.length,
          notes: dto.notes,
          entityId,
          groupId,
          createdById,
          records: { create: records },
        },
        include: { records: { include: { employee: { select: { firstName: true, lastName: true, position: true } } } } },
      });

      return { data: batch, message: 'Payroll batch created successfully', statusCode: 201 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * List all batches for an entity with pagination + stats.
   */
  async updateBatch(id: string, dto: UpdatePayrollBatchDto, entityId: string) {
    try {
      const batch = await this.prisma.payrollBatch.findFirst({ where: { id, entityId } });
      if (!batch) throw new HttpException('Payroll batch not found', HttpStatus.NOT_FOUND);
      if (batch.status === 'Approved') throw new HttpException('Cannot edit an approved payroll batch', HttpStatus.FORBIDDEN);

      const [statutoryDeductions, otherDeductions] = dto.employees?.length
        ? await Promise.all([
            this.prisma.statutoryDeduction.findMany({
              where: { entityId, status: 'active' },
              select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, tiers: { orderBy: { from: 'asc' } } },
            }),
            this.prisma.otherDeduction.findMany({
              where: { entityId, status: 'active' },
              select: { id: true, name: true, type: true, rate: true },
            }),
          ])
        : [[], []];

      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.employees?.length) {
          await tx.payrollRecord.deleteMany({ where: { batchId: id } });
          const records = dto.employees.map((emp) => {
            const gross = emp.basicSalary + (emp.allowances ?? 0) + (emp.bonus ?? 0) + (emp.overtime ?? 0);
            const net = gross - (emp.statutoryDed ?? 0) - (emp.otherDed ?? 0);
            const deductionBreakdown = this.buildDeductionBreakdown(emp.basicSalary, gross, statutoryDeductions, otherDeductions);
            return { employeeId: emp.employeeId, basicSalary: emp.basicSalary, allowances: emp.allowances ?? 0, bonus: emp.bonus ?? 0, overtime: emp.overtime ?? 0, statutoryDed: emp.statutoryDed ?? 0, otherDed: emp.otherDed ?? 0, grossPay: gross, netPay: net, deductionBreakdown, entityId, groupId: batch.groupId };
          });
          await tx.payrollRecord.createMany({ data: records.map(r => ({ ...r, batchId: id })) });
          const totalAmount = records.reduce((s, r) => s + r.netPay, 0);
          return tx.payrollBatch.update({
            where: { id },
            data: {
              ...(dto.batchName && { batchName: dto.batchName }),
              ...(dto.period && { period: dto.period }),
              ...(dto.paymentDate && { paymentDate: new Date(dto.paymentDate) }),
              ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
              ...(dto.notes !== undefined && { notes: dto.notes }),
              totalAmount,
              totalEmployees: records.length,
            },
            include: { records: { include: { employee: { select: { firstName: true, lastName: true, position: true } } } } },
          });
        }
        return tx.payrollBatch.update({
          where: { id },
          data: {
            ...(dto.batchName && { batchName: dto.batchName }),
            ...(dto.period && { period: dto.period }),
            ...(dto.paymentDate && { paymentDate: new Date(dto.paymentDate) }),
            ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
          },
        });
      });
      return { data: updated, message: 'Payroll batch updated successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.BAD_REQUEST);
    }
  }

  async getBatches(entityId: string, query: { page?: number; limit?: number; search?: string; status?: string }) {
    try {
      const { page = 1, limit = 10, search, status } = query;
      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { entityId };
      if (status) where.status = status;
      if (search) where.OR = [{ batchName: { contains: search, mode: 'insensitive' } }, { period: { contains: search, mode: 'insensitive' } }];

      const [batches, total, allBatches] = await Promise.all([
        this.prisma.payrollBatch.findMany({
          where, skip, take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { firstName: true, lastName: true } } },
        }),
        this.prisma.payrollBatch.count({ where }),
        this.prisma.payrollBatch.findMany({ where: { entityId }, select: { status: true } }),
      ]);

      const stats = {
        totalBatches: allBatches.length,
        draft: allBatches.filter((b) => b.status === 'Draft').length,
        pending: allBatches.filter((b) => b.status === 'Pending').length,
        approved: allBatches.filter((b) => b.status === 'Approved').length,
      };

      return { data: batches, stats, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } };
    } catch (error) {
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get single batch with all records.
   */
  async getBatch(id: string, entityId: string) {
    try {
      const batch = await this.prisma.payrollBatch.findFirst({
        where: { id, entityId },
        include: {
          records: {
            include: {
              employee: {
                select: {
                  id: true, firstName: true, lastName: true, position: true,
                  employeeId: true, bankName: true, acountType: true, accountNumber: true,
                  departmentId: true, dept: { select: { name: true } },
                },
              },
            },
          },
          entity: { select: { name: true, logo: true, address: true, currency: true } },
          createdBy:  { select: { firstName: true, lastName: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
      });
      if (!batch) throw new HttpException('Payroll batch not found', HttpStatus.NOT_FOUND);
      const records = batch.records ?? [];
      const enriched = {
        ...batch,
        totalBasicSalary: records.reduce((s: number, r: any) => s + r.basicSalary, 0),
        totalAllowances: records.reduce((s: number, r: any) => s + r.allowances, 0),
        totalBonus: records.reduce((s: number, r: any) => s + r.bonus, 0),
        totalOvertime: records.reduce((s: number, r: any) => s + r.overtime, 0),
        totalGross: records.reduce((s: number, r: any) => s + r.grossPay, 0),
        totalStatDed: records.reduce((s: number, r: any) => s + r.statutoryDed, 0),
        totalOtherDed: records.reduce((s: number, r: any) => s + r.otherDed, 0),
      };
      return { data: enriched };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Change batch status.
   */
  async changeStatus(id: string, status: PayrollStatus, entityId: string, groupId: string, userId?: string | null) {
    try {
      const batch = await this.prisma.payrollBatch.findFirst({ where: { id, entityId } });
      if (!batch) throw new HttpException('Payroll batch not found', HttpStatus.NOT_FOUND);
      const updated = await this.prisma.payrollBatch.update({
        where: { id },
        data: {
          status,
          ...(status === PayrollStatus.Approved && userId
            ? { approvedById: userId, approvedAt: new Date() }
            : {}),
        },
      });
      if (status === PayrollStatus.Approved) {
        await this.bullmqService.addJob('send-payslip-emails', { batchId: id, entityId, groupId });
      }
      return { data: updated, message: `Payroll batch ${status.toLowerCase()} successfully`, statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteBatch(id: string, entityId: string) {
    try {
      const batch = await this.prisma.payrollBatch.findFirst({ where: { id, entityId } });
      if (!batch) throw new HttpException('Payroll batch not found', HttpStatus.NOT_FOUND);
      await this.prisma.payrollBatch.delete({ where: { id } });
      return { data: null, message: 'Payroll batch deleted', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get flat list of all individual payroll records (all batches) with stats.
   */
  async getRecords(entityId: string, query: { page?: number; limit?: number; search?: string }) {
    try {
      const { page = 1, limit = 10, search } = query;
      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { entityId };
      if (search) {
        where.OR = [
          { employee: { firstName: { contains: search, mode: 'insensitive' } } },
          { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [records, total, allApproved] = await Promise.all([
        this.prisma.payrollRecord.findMany({
          where, skip, take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, position: true, dept: { select: { name: true } } } },
            batch: { select: { id: true, batchName: true, period: true, paymentDate: true, status: true, paymentMethod: true } },
          },
        }),
        this.prisma.payrollRecord.count({ where }),
        this.prisma.payrollRecord.findMany({
          where: { entityId, batch: { status: 'Approved', createdAt: { gte: startOfMonth } } },
          select: { netPay: true },
        }),
      ]);

      const totalPayroll = allApproved.reduce((s, r) => s + r.netPay, 0);
      const avgSalary = allApproved.length > 0 ? totalPayroll / allApproved.length : 0;

      // Next upcoming payroll date
      const nextBatch = await this.prisma.payrollBatch.findFirst({
        where: { entityId, status: 'Pending', paymentDate: { gte: new Date() } },
        orderBy: { paymentDate: 'asc' },
        select: { paymentDate: true },
      });

      const stats = {
        totalPayroll: Math.round(totalPayroll),
        employees: allApproved.length,
        avgSalary: Math.round(avgSalary),
        nextPayDate: nextBatch?.paymentDate ?? null,
        daysLeft: nextBatch?.paymentDate
          ? Math.ceil((nextBatch.paymentDate.getTime() - Date.now()) / 86400000)
          : null,
      };

      return { data: records, stats, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } };
    } catch (error) {
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get a single payroll record (payslip data).
   */
  async getRecord(id: string, entityId: string) {
    try {
      const [record, statutoryDeductions, otherDeductions] = await Promise.all([
        this.prisma.payrollRecord.findFirst({
          where: { id, entityId },
          include: {
            employee: {
              select: {
                id: true, firstName: true, lastName: true, position: true,
                employeeId: true, bankName: true, acountType: true, accountNumber: true,
                currency: true, dept: { select: { name: true } },
              },
            },
            batch: { select: { batchName: true, period: true, paymentDate: true, paymentMethod: true, status: true } },
            entity: { select: { name: true, logo: true, address: true, email: true, currency: true } },
          },
        }),
        this.prisma.statutoryDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, tiers: { orderBy: { from: 'asc' } } },
        }),
        this.prisma.otherDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true },
        }),
      ]);
      if (!record) throw new HttpException('Payroll record not found', HttpStatus.NOT_FOUND);

      // Use stored breakdown if available, otherwise compute from current settings
      const deductionBreakdown = (record.deductionBreakdown as any) ??
        this.buildDeductionBreakdown(record.basicSalary, record.grossPay, statutoryDeductions, otherDeductions);

      return { data: { ...record, deductionBreakdown } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPayeReport(entityId: string, year?: number) {
    try {
      const targetYear = year ?? new Date().getFullYear();

      const [employees, statutoryDeductions] = await Promise.all([
        this.prisma.employee.findMany({
          where: { entityId, status: 'Active' },
          select: {
            id: true, firstName: true, lastName: true, position: true,
            salary: true, allowances: true, perFrequency: true,
            tin: true, fctTaxpayerId: true, annualRent: true, employeeId: true,
            payrollRecords: {
              where: {
                batch: {
                  status: 'Approved',
                  paymentDate: { gte: new Date(`${targetYear}-01-01`), lt: new Date(`${targetYear + 1}-01-01`) },
                },
              },
              select: { id: true },
            },
          },
          orderBy: { firstName: 'asc' },
        }),
        this.prisma.statutoryDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, tiers: { orderBy: { from: 'asc' } } },
        }),
      ]);

      const payeDeds = statutoryDeductions.filter((d) => d.type === 'TIERED');
      const allowableDeds = statutoryDeductions.filter((d) => d.type !== 'TIERED');

      const report = employees.map((emp, idx) => {
        const mult = this.frequencyMultiplier(emp.perFrequency);
        const annualGross = ((emp.salary ?? 0) + (emp.allowances ?? 0)) * mult;
        const annualRentPaid = emp.annualRent ?? 0;
        const rentRelief = Math.min(annualRentPaid * 0.20, 500000);

        const deductionLines: { name: string; amount: number }[] = [];
        let totalAllowable = rentRelief;
        for (const d of allowableDeds) {
          let amt = 0;
          if (d.type === 'PERCENTAGE' && d.rate != null) amt = (d.rate / 100) * annualGross;
          else if (d.type === 'FIXED_AMOUNT' && d.fixedAmount != null) {
            if (!d.minAmount || annualGross >= d.minAmount) amt = d.fixedAmount;
          }
          amt = Math.round(amt * 100) / 100;
          deductionLines.push({ name: d.name, amount: amt });
          totalAllowable += amt;
        }

        const chargeableIncome = Math.max(annualGross - totalAllowable, 0);
        const payeDed = payeDeds[0];
        let annualTax = 0;
        const taxBandBreakdown: { label: string; from: number; to: number | null; rate: number; amount: number }[] = [];
        if (payeDed?.tiers?.length) {
          for (const tier of payeDed.tiers) {
            const upper = tier.to ?? Infinity;
            const bracketIncome = Math.min(chargeableIncome, upper) - tier.from;
            const amt = bracketIncome > 0 ? Math.round(bracketIncome * (tier.rate / 100) * 100) / 100 : 0;
            annualTax += amt;
            taxBandBreakdown.push({ label: `${tier.rate}%`, from: tier.from, to: tier.to ?? null, rate: tier.rate, amount: amt });
          }
        }

        return {
          sn: idx + 1,
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position,
          tin: emp.tin ?? '',
          fctTaxpayerId: emp.fctTaxpayerId ?? '',
          annualGross: Math.round(annualGross * 100) / 100,
          annualRentPaid,
          rentRelief: Math.round(rentRelief * 100) / 100,
          deductionLines,
          totalAllowable: Math.round(totalAllowable * 100) / 100,
          chargeableIncome: Math.round(chargeableIncome * 100) / 100,
          taxBandBreakdown,
          annualTax: Math.round(annualTax * 100) / 100,
          monthlyTax: Math.round((annualTax / 12) * 100) / 100,
          remittanceStatus: emp.payrollRecords.length > 0 ? 'Remitted' : 'Pending',
        };
      });

      const totalMonthly = report.reduce((s, r) => s + r.monthlyTax, 0);
      const totalAnnual = report.reduce((s, r) => s + r.annualTax, 0);
      const pendingRemittance = report.filter((r) => r.remittanceStatus === 'Pending').reduce((s, r) => s + r.monthlyTax, 0);
      const remittedCount = report.filter((r) => r.remittanceStatus === 'Remitted').length;

      const taxBands = payeDeds[0]?.tiers?.map((t: any) => ({
        from: t.from, to: t.to ?? null, rate: t.rate,
      })) ?? [];

      return {
        data: {
          year: targetYear,
          employees: report,
          allowableDeductionNames: allowableDeds.map((d) => d.name),
          taxBands,
          stats: {
            totalEmployees: report.length,
            monthlyPayeDue: Math.round(totalMonthly * 100) / 100,
            annualPayeDue: Math.round(totalAnnual * 100) / 100,
            pendingRemittance: Math.round(pendingRemittance * 100) / 100,
            remittedCount,
          },
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
