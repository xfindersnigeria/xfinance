import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePayrollBatchDto, PayrollStatus, UpdatePayrollBatchDto } from './dto/payroll.dto';
import { BullmqService } from '@/bullmq/bullmq.service';

// The queue has no default retry policy, so without this a single transient
// DB error leaves a batch stuck Approved/Failed. Safe to retry: each posting
// handler's writes happen in one atomic transaction.
const POSTING_JOB_OPTIONS = { attempts: 3, backoff: { type: 'exponential', delay: 5000 } };

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private bullmqService: BullmqService,
  ) {}

  /**
   * Nigeria Tax Act 2025 PAYE (effective 2026): rent relief + active eligible
   * statutory deductions (NHF, NHIS, pension, etc.) reduce chargeable income
   * BEFORE the progressive tax bands apply. `periodGross` (not annualized) is
   * used for FIXED_AMOUNT minAmount threshold checks, matching the form's
   * "minimum salary" semantics.
   */
  private computeAnnualPaye(
    annualGross: number,
    periodGross: number,
    annualRentPaid: number,
    eligibleDeductions: { id?: string; name: string; type: string; rate?: number | null; fixedAmount?: number | null; minAmount?: number | null }[],
    payeTiers: { from: number; to?: number | null; rate: number }[],
  ) {
    const rentRelief = Math.min(annualRentPaid * 0.2, 500000);

    const deductionLines = eligibleDeductions.map((d) => {
      let amount = 0;
      if (d.type === 'PERCENTAGE' && d.rate != null) {
        amount = (d.rate / 100) * annualGross;
      } else if (d.type === 'FIXED_AMOUNT' && d.fixedAmount != null) {
        if (!d.minAmount || periodGross >= d.minAmount) amount = d.fixedAmount * 12;
      }
      return { id: d.id, name: d.name, amount: Math.round(amount * 100) / 100 };
    });

    const totalAllowable = rentRelief + deductionLines.reduce((s, d) => s + d.amount, 0);
    const chargeableIncome = Math.max(annualGross - totalAllowable, 0);

    const taxBandBreakdown = payeTiers.map((tier) => {
      const upper = tier.to ?? Infinity;
      const bracketIncome = Math.min(chargeableIncome, upper) - tier.from;
      const amount = bracketIncome > 0 ? Math.round(bracketIncome * (tier.rate / 100) * 100) / 100 : 0;
      return { label: `${tier.rate}%`, from: tier.from, to: tier.to ?? null, rate: tier.rate, amount };
    });
    const annualTax = taxBandBreakdown.reduce((s, t) => s + t.amount, 0);

    return {
      rentRelief: Math.round(rentRelief * 100) / 100,
      deductionLines,
      totalAllowable: Math.round(totalAllowable * 100) / 100,
      chargeableIncome: Math.round(chargeableIncome * 100) / 100,
      taxBandBreakdown,
      annualTax: Math.round(annualTax * 100) / 100,
      monthlyTax: Math.round((annualTax / 12) * 100) / 100,
    };
  }

  /** Compute individual deduction amounts for a single payroll record snapshot. */
  private buildDeductionBreakdown(
    grossPay: number,
    annualRent: number,
    statutoryDeductions: any[],
    otherDeductions: any[],
  ) {
    const annualGross = grossPay * 12;
    const tieredDed = statutoryDeductions.find((d) => d.type === 'TIERED');
    const eligibleDeds = statutoryDeductions.filter((d) => d.type !== 'TIERED');

    const paye = this.computeAnnualPaye(annualGross, grossPay, annualRent, eligibleDeds, tieredDed?.tiers ?? []);

    const statutory = eligibleDeds.map((d) => {
      const line = paye.deductionLines.find((l) => l.id === d.id);
      return { id: d.id, name: d.name, type: d.type, accountId: d.accountId ?? null, amount: Math.round(((line?.amount ?? 0) / 12) * 100) / 100 };
    });

    if (tieredDed) {
      statutory.push({ id: tieredDed.id, name: tieredDed.name, type: tieredDed.type, accountId: tieredDed.accountId ?? null, amount: paye.monthlyTax });
    }

    const other = otherDeductions.map((d) => {
      let amount = 0;
      if (d.type === 'PERCENTAGE' && d.rate != null) amount = (d.rate / 100) * grossPay;
      else if (d.type === 'FIXED_AMOUNT' && d.rate != null) amount = d.rate;
      return { id: d.id, name: d.name, amount: Math.round(amount * 100) / 100 };
    });

    return {
      statutory,
      other,
      payeDetail: {
        rentRelief: paye.rentRelief,
        annualGross,
        deductionLines: paye.deductionLines,
        totalAllowable: paye.totalAllowable,
        chargeableIncome: paye.chargeableIncome,
        taxBandBreakdown: paye.taxBandBreakdown,
        annualTax: paye.annualTax,
      },
    };
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
  /**
   * Recompute the statutory deduction for one employee against arbitrary
   * (possibly unsaved) earnings figures — used by the payroll form to keep
   * "Statutory Ded." live as an admin edits basic salary/allowances/bonus/
   * overtime, instead of leaving it pinned to the initial prefill suggestion.
   */
  async previewDeduction(
    entityId: string,
    employeeId: string,
    basicSalary: number,
    allowances: number,
    bonus: number,
    overtime: number,
  ) {
    const [employee, statutoryDeductions, otherDeductions] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id: employeeId, entityId }, select: { annualRent: true } }),
      this.prisma.statutoryDeduction.findMany({
        where: { entityId, status: 'active' },
        select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, accountId: true, tiers: { orderBy: { from: 'asc' } } },
      }),
      this.prisma.otherDeduction.findMany({
        where: { entityId, status: 'active' },
        select: { id: true, name: true, type: true, rate: true },
      }),
    ]);
    if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

    const grossPay = basicSalary + (allowances ?? 0) + (bonus ?? 0) + (overtime ?? 0);
    const deductionBreakdown = this.buildDeductionBreakdown(grossPay, employee.annualRent ?? 0, statutoryDeductions, otherDeductions);
    const statutoryDed = Math.round(deductionBreakdown.statutory.reduce((s, d) => s + d.amount, 0) * 100) / 100;

    return { data: { statutoryDed, deductionBreakdown } };
  }

  async getPrefillData(entityId: string) {
    const [employees, statutoryDeductions, otherDeductions] = await Promise.all([
      this.prisma.employee.findMany({
        where: { entityId, status: 'Active' },
        select: {
          id: true, firstName: true, lastName: true, position: true,
          salary: true, allowances: true, currency: true, departmentId: true,
          annualRent: true,
          dept: { select: { name: true } },
        },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.statutoryDeduction.findMany({
        where: { entityId, status: 'active' },
        select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, accountId: true, tiers: { orderBy: { from: 'asc' } } },
      }),
      this.prisma.otherDeduction.findMany({
        where: { entityId, status: 'active' },
        select: { id: true, name: true, type: true, rate: true },
      }),
    ]);

    const employeesWithSuggestions = employees.map((emp) => {
      const salary = emp.salary ?? 0;
      const allowances = emp.allowances ?? 0;
      const grossPay = salary + allowances;

      const deductionBreakdown = this.buildDeductionBreakdown(grossPay, emp.annualRent ?? 0, statutoryDeductions, otherDeductions);
      const suggestedStatutoryDed = deductionBreakdown.statutory.reduce((sum, d) => sum + d.amount, 0);
      const suggestedOtherDed = deductionBreakdown.other.reduce((sum, d) => sum + d.amount, 0);

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
        deductionBreakdown,
      };
    });

    return { data: employeesWithSuggestions };
  }

  /**
   * Create a payroll batch with records for all selected employees.
   */
  async createBatch(dto: CreatePayrollBatchDto, entityId: string, groupId: string, createdById: string) {
    try {
      const employeeIds = dto.employees.map((e) => e.employeeId);
      const [statutoryDeductions, otherDeductions, employeeRents] = await Promise.all([
        this.prisma.statutoryDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, accountId: true, tiers: { orderBy: { from: 'asc' } } },
        }),
        this.prisma.otherDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true },
        }),
        this.prisma.employee.findMany({
          where: { id: { in: employeeIds }, entityId },
          select: { id: true, annualRent: true },
        }),
      ]);
      const rentByEmployee = new Map(employeeRents.map((e) => [e.id, e.annualRent ?? 0]));

      const records = dto.employees.map((emp) => {
        const basicSalary = emp.basicSalary;
        const allowances = emp.allowances ?? 0;
        const bonus = emp.bonus ?? 0;
        const overtime = emp.overtime ?? 0;
        const otherDed = emp.otherDed ?? 0;
        const grossPay = basicSalary + allowances + bonus + overtime;
        const deductionBreakdown = this.buildDeductionBreakdown(grossPay, rentByEmployee.get(emp.employeeId) ?? 0, statutoryDeductions, otherDeductions);
        const statutoryDed = Math.round(deductionBreakdown.statutory.reduce((s, d) => s + d.amount, 0) * 100) / 100;
        const netPay = grossPay - statutoryDed - otherDed;
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

      const [statutoryDeductions, otherDeductions, employeeRents] = dto.employees?.length
        ? await Promise.all([
            this.prisma.statutoryDeduction.findMany({
              where: { entityId, status: 'active' },
              select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, accountId: true, tiers: { orderBy: { from: 'asc' } } },
            }),
            this.prisma.otherDeduction.findMany({
              where: { entityId, status: 'active' },
              select: { id: true, name: true, type: true, rate: true },
            }),
            this.prisma.employee.findMany({
              where: { id: { in: dto.employees.map((e) => e.employeeId) }, entityId },
              select: { id: true, annualRent: true },
            }),
          ])
        : [[], [], []];
      const rentByEmployee = new Map(employeeRents.map((e: any) => [e.id, e.annualRent ?? 0]));

      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.employees?.length) {
          await tx.payrollRecord.deleteMany({ where: { batchId: id } });
          const records = dto.employees.map((emp) => {
            const gross = emp.basicSalary + (emp.allowances ?? 0) + (emp.bonus ?? 0) + (emp.overtime ?? 0);
            const otherDed = emp.otherDed ?? 0;
            const deductionBreakdown = this.buildDeductionBreakdown(gross, rentByEmployee.get(emp.employeeId) ?? 0, statutoryDeductions, otherDeductions);
            const statutoryDed = Math.round(deductionBreakdown.statutory.reduce((s, d) => s + d.amount, 0) * 100) / 100;
            const net = gross - statutoryDed - otherDed;
            return { employeeId: emp.employeeId, basicSalary: emp.basicSalary, allowances: emp.allowances ?? 0, bonus: emp.bonus ?? 0, overtime: emp.overtime ?? 0, statutoryDed, otherDed, grossPay: gross, netPay: net, deductionBreakdown, entityId, groupId: batch.groupId };
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
  /**
   * Resolve default accounts and aggregate the balanced journal lines for a
   * payroll approval posting (Dr Salaries & Wages Expense = total gross,
   * Cr each statutory deduction's linked payable account, Cr Other
   * Deductions Payable, Cr Wages Payable = total net). Pure validation +
   * aggregation, called BEFORE the batch status is updated, so a missing
   * default account fails the whole request instead of leaving the batch
   * marked Approved with nothing actually queued for posting.
   */
  private async buildPayrollApprovalPostingData(batch: any, entityId: string) {
    const records: any[] = batch.records ?? [];
    const totalGross = Math.round(records.reduce((s, r) => s + r.grossPay, 0) * 100) / 100;
    const totalNet = Math.round(records.reduce((s, r) => s + r.netPay, 0) * 100) / 100;
    const totalOther = Math.round(records.reduce((s, r) => s + r.otherDed, 0) * 100) / 100;

    const [salariesExpenseAccount, wagesPayableAccount, otherDeductionsPayableAccount, currentDeductions] = await Promise.all([
      this.prisma.account.findFirst({ where: { entityId, code: '5210-01' }, select: { id: true } }),
      this.prisma.account.findFirst({ where: { entityId, code: '2120-01' }, select: { id: true } }),
      this.prisma.account.findFirst({ where: { entityId, code: '2195-01' }, select: { id: true } }),
      this.prisma.statutoryDeduction.findMany({ where: { entityId }, select: { id: true, accountId: true } }),
    ]);

    // Records created before deduction->account linking existed have no
    // accountId in their snapshot; fall back to the deduction's current link.
    const currentAccountByDeduction = new Map(currentDeductions.map((d) => [d.id, d.accountId]));

    const statutoryByAccount = new Map<string, number>();
    const unlinked = new Set<string>();
    for (const r of records) {
      const lines: any[] = (r.deductionBreakdown as any)?.statutory ?? [];
      const linesTotal = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
      if (Math.abs(linesTotal - r.statutoryDed) > 0.01) {
        throw new HttpException(
          'A record in this batch has no itemized deduction breakdown (it predates breakdown tracking). Edit and re-save the batch before approving so its deductions are recomputed.',
          HttpStatus.BAD_REQUEST,
        );
      }
      for (const line of lines) {
        if (!line.amount) continue;
        const accountId = line.accountId ?? currentAccountByDeduction.get(line.id);
        if (!accountId) {
          unlinked.add(line.name);
          continue;
        }
        statutoryByAccount.set(accountId, (statutoryByAccount.get(accountId) ?? 0) + line.amount);
      }
    }

    if (unlinked.size > 0) {
      throw new HttpException(
        `These statutory deductions have no linked payable account: ${[...unlinked].join(', ')}. Set one under Settings > Payroll > Statutory Deductions, then approve again.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!salariesExpenseAccount || !wagesPayableAccount) {
      throw new HttpException(
        'Default Salaries & Wages / Wages Payable accounts not found for this entity — run the account backfill first.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (totalOther > 0 && !otherDeductionsPayableAccount) {
      throw new HttpException(
        'Default Other Deductions Payable account not found for this entity — run the account backfill first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      totalGross,
      totalNet,
      totalOther,
      salariesExpenseAccountId: salariesExpenseAccount.id,
      wagesPayableAccountId: wagesPayableAccount.id,
      otherDeductionsPayableAccountId: otherDeductionsPayableAccount?.id ?? null,
      statutoryLines: Array.from(statutoryByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        amount: Math.round(amount * 100) / 100,
      })),
    };
  }

  async changeStatus(id: string, status: PayrollStatus, entityId: string, groupId: string, userId?: string | null) {
    try {
      if (status === PayrollStatus.Paid) {
        throw new HttpException('Use the mark-as-paid action to record payment of an approved batch', HttpStatus.BAD_REQUEST);
      }

      const batch = await this.prisma.payrollBatch.findFirst({
        where: { id, entityId },
        include: { records: true },
      });
      if (!batch) throw new HttpException('Payroll batch not found', HttpStatus.NOT_FOUND);

      if (batch.status === PayrollStatus.Approved || batch.status === PayrollStatus.Paid) {
        throw new HttpException(`Cannot change status of a batch that is already ${batch.status} — the ledger has already been posted`, HttpStatus.FORBIDDEN);
      }

      // Resolve + validate everything the posting needs BEFORE committing the
      // status change, so a missing default account never leaves the batch
      // marked Approved with no posting queued.
      const postingData = status === PayrollStatus.Approved
        ? await this.buildPayrollApprovalPostingData(batch, entityId)
        : null;

      const updated = await this.prisma.payrollBatch.update({
        where: { id },
        data: {
          status,
          ...(status === PayrollStatus.Approved && userId
            ? { approvedById: userId, approvedAt: new Date() }
            : {}),
          ...(postingData ? { netPayableAccountId: postingData.wagesPayableAccountId } : {}),
        },
      });

      if (status === PayrollStatus.Approved && postingData) {
        await this.bullmqService.addJob('send-payslip-emails', { batchId: id, entityId, groupId });
        await this.bullmqService.addJob('post-payroll-journal', {
          batchId: id,
          entityId,
          groupId,
          postingData: { reference: batch.batchName, ...postingData },
        }, POSTING_JOB_OPTIONS);
      }

      return { data: updated, message: `Payroll batch ${status.toLowerCase()} successfully`, statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error instanceof Error ? error.message : String(error), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Record payment of an approved, already-posted payroll batch:
   * Dr Wages Payable (the same account credited at approval) / Cr the
   * chosen bank/cash account. Creates a PayrollPayment row (mirrors
   * PaymentMade's relationship to Bills) and queues its own posting job.
   */
  async markAsPaid(id: string, entityId: string, groupId: string, cashAccountId: string, userId?: string | null) {
    try {
      const batch = await this.prisma.payrollBatch.findFirst({ where: { id, entityId } });
      if (!batch) throw new HttpException('Payroll batch not found', HttpStatus.NOT_FOUND);
      if (batch.status !== PayrollStatus.Approved) {
        throw new HttpException('Only an approved payroll batch can be marked as paid', HttpStatus.FORBIDDEN);
      }
      if (batch.postingStatus !== 'Success') {
        throw new HttpException('This batch has not finished posting to the ledger yet — wait for posting to complete (or resolve its posting error) before marking it as paid', HttpStatus.FORBIDDEN);
      }
      if (!batch.netPayableAccountId) {
        throw new HttpException('No net-salaries-payable account recorded for this batch', HttpStatus.BAD_REQUEST);
      }

      const cashAccount = await this.prisma.account.findFirst({ where: { id: cashAccountId, entityId }, select: { id: true } });
      if (!cashAccount) throw new HttpException('Selected bank/cash account not found for this entity', HttpStatus.NOT_FOUND);

      const existingPayment = await this.prisma.payrollPayment.findFirst({
        where: { batchId: id, postingStatus: { in: ['Pending', 'Processing', 'Success'] } },
      });
      if (existingPayment) {
        throw new HttpException('This batch has already been marked as paid', HttpStatus.CONFLICT);
      }

      const payment = await this.prisma.payrollPayment.create({
        data: {
          batchId: id,
          paymentDate: new Date(),
          amount: batch.totalAmount,
          accountId: cashAccountId,
          entityId,
          groupId,
          createdById: userId ?? null,
        },
      });

      await this.prisma.payrollBatch.update({ where: { id }, data: { status: PayrollStatus.Paid } });

      await this.bullmqService.addJob('post-payroll-payment-journal', {
        paymentId: payment.id,
        batchId: id,
        entityId,
        groupId,
        paymentData: {
          amount: batch.totalAmount,
          netPayableAccountId: batch.netPayableAccountId,
          cashAccountId,
        },
      }, POSTING_JOB_OPTIONS);

      return { data: payment, message: 'Payroll batch marked as paid', statusCode: 200 };
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
                currency: true, annualRent: true, dept: { select: { name: true } },
              },
            },
            batch: { select: { batchName: true, period: true, paymentDate: true, paymentMethod: true, status: true } },
            entity: { select: { name: true, logo: true, address: true, email: true, currency: true } },
          },
        }),
        this.prisma.statutoryDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, accountId: true, tiers: { orderBy: { from: 'asc' } } },
        }),
        this.prisma.otherDeduction.findMany({
          where: { entityId, status: 'active' },
          select: { id: true, name: true, type: true, rate: true },
        }),
      ]);
      if (!record) throw new HttpException('Payroll record not found', HttpStatus.NOT_FOUND);

      // Use stored breakdown if available, otherwise compute from current settings
      const deductionBreakdown = (record.deductionBreakdown as any) ??
        this.buildDeductionBreakdown(record.grossPay, (record.employee as any)?.annualRent ?? 0, statutoryDeductions, otherDeductions);

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
          select: { id: true, name: true, type: true, rate: true, fixedAmount: true, minAmount: true, accountId: true, tiers: { orderBy: { from: 'asc' } } },
        }),
      ]);

      const payeDeds = statutoryDeductions.filter((d) => d.type === 'TIERED');
      const allowableDeds = statutoryDeductions.filter((d) => d.type !== 'TIERED');
      const payeDed = payeDeds[0];

      const report = employees.map((emp, idx) => {
        const mult = this.frequencyMultiplier(emp.perFrequency);
        const periodGross = (emp.salary ?? 0) + (emp.allowances ?? 0);
        const annualGross = periodGross * mult;
        const annualRentPaid = emp.annualRent ?? 0;

        const paye = this.computeAnnualPaye(annualGross, periodGross, annualRentPaid, allowableDeds, payeDed?.tiers ?? []);

        return {
          sn: idx + 1,
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position,
          tin: emp.tin ?? '',
          fctTaxpayerId: emp.fctTaxpayerId ?? '',
          annualGross: Math.round(annualGross * 100) / 100,
          annualRentPaid,
          rentRelief: paye.rentRelief,
          deductionLines: paye.deductionLines,
          totalAllowable: paye.totalAllowable,
          chargeableIncome: paye.chargeableIncome,
          taxBandBreakdown: paye.taxBandBreakdown,
          annualTax: paye.annualTax,
          monthlyTax: paye.monthlyTax,
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
