import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateMilestoneDto,
  CreateTeamMemberDto,
  GetEntityMilestonesDto,
  GetEntityProjectsDto,
  GetProjectTeamMembersDto,
  Projects,
  UpdateMilestoneDto,
  UpdateProjectDto,
  UpdateTeamMemberDto,
} from './dto/projects.dto';
import { generateRandomInvoiceNumber } from '@/auth/utils/helper';
import { MilestoneStatus, ProjectStatus } from 'prisma/generated/enums';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function safe(numerator: number, denominator: number, decimals = 2): number {
  if (!denominator || denominator === 0) return 0;
  const result = numerator / denominator;
  if (!isFinite(result) || isNaN(result)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(result * factor) / factor;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async createProject(project: Projects, entityId: string, groupId: string) {
    try {
      const projectNumber = generateRandomInvoiceNumber({ prefix: 'PRO' });
      return await this.prisma.project.create({
        data: {
          ...project,
          projectNumber,
          entityId,
          groupId,
          status: project.status as ProjectStatus,
        },
      });
    } catch (error) {
      throw new HttpException(`${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async getEntityProjects(entityId: string, dto: GetEntityProjectsDto) {
    try {
      const { status, search, page = 1, limit = 10 } = dto;
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { projectNumber: { contains: search, mode: 'insensitive' } },
          { projectCode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [projects, total] = await Promise.all([
        this.prisma.project.findMany({
          where,
          include: { customer: true, entity: true, milestones: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        this.prisma.project.count({ where }),
      ]);

      const stats = await this.calculateProjectStats(entityId, status, search);

      return {
        data: projects,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
        stats,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch projects: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Get by ID (header stat cards only) ──────────────────────────────────

  async getProjectById(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({
        where: { projectNumber:id, entityId },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const [milestoneTotal, milestoneCompleted, teamMembers, paymentAgg, expenseAgg, billsAgg] =
        await Promise.all([
          this.prisma.milestone.count({ where: { projectId: project.id } }),
          this.prisma.milestone.count({ where: { projectId: project.id, status: MilestoneStatus.Completed } }),
          this.prisma.teamMember.findMany({
            where: { projectId: project.id },
            select: { monthlyRate: true, estimatedMonths: true },
          }),
          this.prisma.paymentReceived.aggregate({
            where: { invoice: { projectId: project.id } },
            _sum: { total: true },
          }),
          this.prisma.expenses.aggregate({
            where: { projectId: project.id, status: 'approved' },
            _sum: { amount: true },
          }),
          this.prisma.bills.aggregate({
            where: { projectId: project.id, status: 'paid' },
            _sum: { total: true },
          }),
        ]);

      const progress = milestoneTotal > 0 ? Math.round((milestoneCompleted / milestoneTotal) * 100) : 0;
      const teamMemberCount = teamMembers.length;
      const totalLaborCost = teamMembers.reduce((s, m) => s + m.monthlyRate * m.estimatedMonths, 0);
      const actualRevenue = paymentAgg._sum?.total ?? 0;
      const actualCost = (expenseAgg._sum?.amount ?? 0) + (billsAgg._sum?.total ?? 0) + totalLaborCost;
      const actualProfit = actualRevenue - actualCost;
      const budgetProfit = project.budgetedRevenue - project.budgetedCost;
      const profitMargin = safe((actualRevenue - actualCost) * 100, actualRevenue);

      return {
        ...project,
        actualRevenue,
        actualCost,
        actualProfit,
        budgetProfit,
        profitMargin,
        progress,
        teamMemberCount,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch project: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Overview tab (burn rate + milestone progress) ─────────────────────────

  async getProjectOverview(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const milestones = await this.prisma.milestone.findMany({ where: { projectId: id } });
      const totalMilestones = milestones.length;
      const completedMilestoneCount = milestones.filter((m) => m.status === MilestoneStatus.Completed).length;
      const inProgressMilestoneCount = milestones.filter((m) => m.status === MilestoneStatus.In_Progress).length;
      const upcomingMilestoneCount = milestones.filter((m) => m.status === MilestoneStatus.Upcoming).length;
      const progress = totalMilestones > 0 ? Math.round((completedMilestoneCount / totalMilestones) * 100) : 0;

      const burnRate = await this.computeBurnRate(id, project.startDate, project.endDate, project.budgetedCost);

      return { burnRate, progress, completedMilestoneCount, inProgressMilestoneCount, upcomingMilestoneCount };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Failed to fetch project overview: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Analysis tab (variance, CPI, projections) ────────────────────────────

  async getProjectAnalysis(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const [milestoneTotal, milestoneCompleted, teamMembers, paymentAgg, expenseAgg, billsAgg] =
        await Promise.all([
          this.prisma.milestone.count({ where: { projectId: id } }),
          this.prisma.milestone.count({ where: { projectId: id, status: MilestoneStatus.Completed } }),
          this.prisma.teamMember.findMany({
            where: { projectId: id },
            select: { monthlyRate: true, estimatedMonths: true },
          }),
          this.prisma.paymentReceived.aggregate({
            where: { invoice: { projectId: id } },
            _sum: { total: true },
          }),
          this.prisma.expenses.aggregate({
            where: { projectId: id, status: 'approved' },
            _sum: { amount: true },
          }),
          this.prisma.bills.aggregate({
            where: { projectId: id, status: 'paid' },
            _sum: { total: true },
          }),
        ]);

      const progress = milestoneTotal > 0 ? Math.round((milestoneCompleted / milestoneTotal) * 100) : 0;
      const totalLaborCost = teamMembers.reduce((s, m) => s + m.monthlyRate * m.estimatedMonths, 0);
      const actualRevenue = paymentAgg._sum?.total ?? 0;
      const actualCost = (expenseAgg._sum?.amount ?? 0) + (billsAgg._sum?.total ?? 0) + totalLaborCost;
      const actualProfit = actualRevenue - actualCost;
      const budgetedRevenue = project.budgetedRevenue;
      const budgetedCost = project.budgetedCost;
      const budgetProfit = budgetedRevenue - budgetedCost;

      const costVariance = budgetedCost - actualCost;
      const costVariancePercent = safe((actualCost - budgetedCost) * 100, budgetedCost);
      const costPerformanceIndex = safe(budgetedCost, actualCost);
      const projectedRevenue = progress > 0 ? safe(actualRevenue * 100, progress, 0) : 0;
      const projectedCost = progress > 0 ? safe(actualCost * 100, progress, 0) : 0;
      const projectedProfit = projectedRevenue - projectedCost;
      const projectedMargin = safe(projectedProfit * 100, projectedRevenue);

      return {
        actualRevenue,
        actualCost,
        budgetedRevenue,
        budgetedCost,
        actualProfit,
        budgetProfit,
        progress,
        costVariance,
        costVariancePercent,
        costPerformanceIndex,
        projectedRevenue,
        projectedCost,
        projectedProfit,
        projectedMargin,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Failed to fetch project analysis: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updateProject(id: string, dto: UpdateProjectDto, entityId: string) {
    try {
      const existing = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const { startDate, endDate, status, ...rest } = dto;
      return await this.prisma.project.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(status && { status: status as ProjectStatus }),
        } as any,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to update project: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteProject(id: string, entityId: string) {
    try {
      const existing = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
      await this.prisma.project.delete({ where: { id } });
      return { message: 'Project deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to delete project: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Project income (invoices) ─────────────────────────────────────────────

  async getProjectIncome(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const invoices = await this.prisma.invoice.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
      });

      const data = invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.createdAt,
        description: inv.notes ?? '',
        amount: inv.total,
        status: inv.status,
        type: 'Invoice',
      }));

      const totalIncome = invoices.reduce((sum, inv) => sum + inv.total, 0);

      return { data, totalIncome };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch project income: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Project expenses (expenses + bills merged) ────────────────────────────

  async getProjectExpenses(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const [expenses, bills] = await Promise.all([
        this.prisma.expenses.findMany({
          where: { projectId: id },
          orderBy: { date: 'desc' },
        }),
        this.prisma.bills.findMany({
          where: { projectId: id },
          orderBy: { billDate: 'desc' },
        }),
      ]);

      const expenseRows = expenses.map((e) => ({
        id: e.id,
        reference: e.reference,
        date: e.date,
        description: e.description ?? '',
        amount: e.amount,
        status: e.status,
        sourceType: 'expense' as const,
      }));

      const billRows = bills.map((b) => ({
        id: b.id,
        reference: b.billNumber,
        date: b.billDate,
        description: b.subject,
        amount: b.total,
        status: b.status,
        sourceType: 'bill' as const,
      }));

      const data = [...expenseRows, ...billRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      const totalExpenses = data.reduce((sum, row) => sum + row.amount, 0);

      return { data, totalExpenses };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch project expenses: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Project team ──────────────────────────────────────────────────────────

  async getProjectTeam(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const members = await this.prisma.teamMember.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'asc' },
      });

      const data = members.map((m) => ({
        id: m.id,
        fullName: m.name,
        email: m.email,
        role: m.role,
        estimatedMonths: m.estimatedMonths,
        monthlyRate: m.monthlyRate,
        totalCost: m.monthlyRate * m.estimatedMonths,
      }));

      const totalLaborCost = data.reduce((sum, m) => sum + m.totalCost, 0);
      const totalMonths = data.reduce((sum, m) => sum + m.estimatedMonths, 0);

      return { data, totalLaborCost, totalMonths };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch project team: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Project milestones ────────────────────────────────────────────────────

  async getProjectMilestones(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const milestones = await this.prisma.milestone.findMany({
        where: { projectId: id },
        orderBy: { dueDate: 'asc' },
      });

      const data = milestones.map((m) => {
        const variance = m.budget - m.actualAmount;
        const variancePercent = safe((m.actualAmount - m.budget) * 100, m.budget);
        return {
          id: m.id,
          name: m.name,
          description: m.description,
          dueDate: m.dueDate,
          status: m.status,
          budgetAmount: m.budget,
          actualAmount: m.actualAmount,
          variance,
          variancePercent,
        };
      });

      const totalBudget = milestones.reduce((sum, m) => sum + m.budget, 0);
      const totalActual = milestones.reduce((sum, m) => sum + m.actualAmount, 0);

      return { data, totalBudget, totalActual };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch project milestones: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Project supplies ──────────────────────────────────────────────────────

  async getProjectSupplies(id: string, entityId: string) {
    try {
      const project = await this.prisma.project.findFirst({ where: { id, entityId } });
      if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

      const issues = await this.prisma.supplyIssueHistory.findMany({
        where: { projectId: id },
        include: { supply: { select: { name: true, sku: true, unitPrice: true } } },
        orderBy: { issueDate: 'desc' },
      });

      const data = issues.map((iss, idx) => ({
        id: `ISS-${String(idx + 1).padStart(3, '0')}`,
        rawId: iss.id,
        date: iss.issueDate,
        supplyName: iss.supply.name,
        sku: iss.supply.sku ?? '',
        quantity: iss.quantity,
        unitPrice: iss.supply.unitPrice,
        totalCost: iss.supply.unitPrice * iss.quantity,
      }));

      const totalSuppliesCost = data.reduce((sum, row) => sum + row.totalCost, 0);

      return { data, totalSuppliesCost };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch project supplies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Milestones (entity-level list) ────────────────────────────────────────

  async createMilestone(dto: CreateMilestoneDto, entityId: string, groupId: string) {
    try {
      return await this.prisma.milestone.create({
        data: {
          ...dto,
          dueDate: new Date(dto.dueDate),
          entityId,
          groupId,
        },
      });
    } catch (error) {
      throw new HttpException(`${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto, entityId: string) {
    try {
      const existing = await this.prisma.milestone.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Milestone not found', HttpStatus.NOT_FOUND);
      const { dueDate, status, ...rest } = dto;
      return await this.prisma.milestone.update({
        where: { id },
        data: {
          ...rest,
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(status && { status }),
        } as any,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getEntityMilestones(entityId: string, dto: GetEntityMilestonesDto) {
    try {
      const { projectId, status, search, page = 1, limit = 10 } = dto;
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [milestones, total] = await Promise.all([
        this.prisma.milestone.findMany({
          where,
          include: { project: true },
          orderBy: { dueDate: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.milestone.count({ where }),
      ]);

      return {
        data: milestones,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch milestones: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Team members (entity-level) ───────────────────────────────────────────

  async createTeamMember(dto: CreateTeamMemberDto, entityId: string, groupId: string) {
    try {
      return await this.prisma.teamMember.create({
        data: { ...dto, entityId, groupId },
      });
    } catch (error) {
      throw new HttpException(`${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateTeamMember(id: string, dto: UpdateTeamMemberDto, entityId: string) {
    try {
      const existing = await this.prisma.teamMember.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Team member not found', HttpStatus.NOT_FOUND);
      return await this.prisma.teamMember.update({ where: { id }, data: dto as any });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getProjectTeamMembers(entityId: string, dto: GetProjectTeamMembersDto) {
    try {
      const { projectId, page = 1, limit = 10 } = dto;
      const skip = (page - 1) * limit;
      const where = { entityId, projectId };

      const [members, total] = await Promise.all([
        this.prisma.teamMember.findMany({
          where,
          include: { project: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.teamMember.count({ where }),
      ]);

      return {
        data: members,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch team members: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async calculateProjectStats(
    entityId: string,
    status?: ProjectStatus,
    search?: string,
  ) {
    const where: any = { entityId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [stats, activeProjects, allProjects] = await Promise.all([
      this.prisma.project.aggregate({
        where,
        _sum: { budgetedRevenue: true, budgetedCost: true },
        _count: { id: true },
      }),
      this.prisma.project.count({
        where: { ...where, status: ProjectStatus.In_Progress },
      }),
      this.prisma.project.findMany({
        where,
        select: { id: true, teamMember: { select: { monthlyRate: true, estimatedMonths: true } } },
      }),
    ]);

    const projectIds = allProjects.map((p) => p.id);

    const [paymentAgg, expenseAgg, billsAgg] = await Promise.all([
      this.prisma.paymentReceived.aggregate({
        where: { invoice: { projectId: { in: projectIds } } },
        _sum: { total: true },
      }),
      this.prisma.expenses.aggregate({
        where: { projectId: { in: projectIds }, status: 'approved' },
        _sum: { amount: true },
      }),
      this.prisma.bills.aggregate({
        where: { projectId: { in: projectIds }, status: 'paid' },
        _sum: { total: true },
      }),
    ]);

    const totalLaborCost = allProjects.reduce(
      (sum, p) =>
        sum + p.teamMember.reduce((s, m) => s + m.monthlyRate * m.estimatedMonths, 0),
      0,
    );

    const totalProjects = stats._count.id;
    const totalBudgetRevenue = stats._sum.budgetedRevenue ?? 0;
    const totalBudgetCost = stats._sum.budgetedCost ?? 0;
    const totalActualRevenue = paymentAgg._sum?.total ?? 0;
    const totalActualCost =
      (expenseAgg._sum?.amount ?? 0) +
      (billsAgg._sum?.total ?? 0) +
      totalLaborCost;

    const avgProfitMargin = safe((totalActualRevenue - totalActualCost) * 100, totalActualRevenue);

    return {
      totalProjects,
      activeProjects,
      totalBudgetRevenue,
      totalBudgetCost,
      totalActualRevenue,
      totalActualCost,
      avgProfitMargin: `${avgProfitMargin}%`,
    };
  }

  private async computeBurnRate(
    projectId: string,
    startDate: Date,
    endDate: Date,
    budgetedCost: number,
  ): Promise<{ month: string; budgeted: number; actual: number }[]> {
    const months: { label: string; start: Date; end: Date }[] = [];
    const cursor = new Date(startDate);
    cursor.setDate(1);

    while (cursor <= endDate) {
      const start = new Date(cursor);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
      months.push({
        label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`,
        start,
        end,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    if (months.length === 0) return [];

    const monthlyBudget = Math.round(budgetedCost / months.length);

    const [expenses, bills] = await Promise.all([
      this.prisma.expenses.findMany({
        where: {
          projectId,
          status: 'approved',
          date: { gte: startDate, lte: endDate },
        },
        select: { amount: true, date: true },
      }),
      this.prisma.bills.findMany({
        where: {
          projectId,
          status: 'paid',
          billDate: { gte: startDate, lte: endDate },
        },
        select: { total: true, billDate: true },
      }),
    ]);

    return months.map(({ label, start, end }) => {
      const actualExpenses = expenses
        .filter((e) => e.date >= start && e.date <= end)
        .reduce((s, e) => s + e.amount, 0);
      const actualBills = bills
        .filter((b) => b.billDate >= start && b.billDate <= end)
        .reduce((s, b) => s + b.total, 0);
      return { month: label, budgeted: monthlyBudget, actual: actualExpenses + actualBills };
    });
  }
}
