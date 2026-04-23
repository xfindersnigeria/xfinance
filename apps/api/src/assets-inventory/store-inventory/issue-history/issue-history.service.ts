import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateIssueHistoryDto, BulkIssueHistoryDto, UpdateIssueHistoryDto } from './issue-history.dto';

@Injectable()
export class IssueHistoryService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateIssueHistoryDto, entityId: string, groupId: string) {
    try {
      const supply = await this.prisma.storeSupply.findFirst({ where: { id: createDto.supplyId, entityId } });
      if (!supply) throw new HttpException('Supply not found', HttpStatus.NOT_FOUND);
      if (supply.quantity < createDto.quantity) throw new HttpException('Insufficient quantity in stock', HttpStatus.BAD_REQUEST);

      let employeeId: string | null = null;
      let projectId: string | null = null;
      let departmentId: string | null = null;
      let issuedTo = createDto.issuedTo;
      if (createDto.type === 'employee') {
        const employee = await this.prisma.employee.findFirst({ where: { id: createDto.issuedTo, entityId } });
        if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
        employeeId = createDto.issuedTo;
        issuedTo = `${employee.firstName} ${employee.lastName}`;
      } else if (createDto.type === 'project'){
        const project = await this.prisma.project.findFirst({ where: { id: createDto.issuedTo, entityId } });
        if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
        projectId = createDto.issuedTo;
        issuedTo = `${project.name}`;

      } else if (createDto.type === 'department') {
        const department = await this.prisma.department.findFirst({ where: { id: createDto.issuedTo, entityId } });
        if (!department) throw new HttpException('department not found', HttpStatus.NOT_FOUND);
        departmentId = createDto.issuedTo;
        issuedTo = `${department.name}`;

      }

      const issue = await this.prisma.$transaction(async (tx) => {
        const created = await tx.supplyIssueHistory.create({
          data: {
            supplyId: createDto.supplyId,
            quantity: createDto.quantity,
            issuedTo,
            type: createDto.type,
            purpose: createDto.purpose,
            issuedById: createDto.issuedById,
            notes: createDto.notes,
            issueDate: createDto.issueDate,
            entityId,
            groupId,
            employeeId,
            projectId,
            departmentId,
          },
        });

        await tx.storeSupply.update({
          where: { id: createDto.supplyId },
          data: { quantity: supply.quantity - createDto.quantity },
        });

        return created;
      });

      return issue;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async bulkCreate(bulkDto: BulkIssueHistoryDto, entityId: string, groupId: string) {
    try {
      const { items, ...rest } = bulkDto;

      let employeeId: string | null = null;
      let projectId: string | null = null;
      let departmentId: string | null = null;
      let issuedTo = rest.issuedTo;

      if (rest.type === 'employee') {
        const employee = await this.prisma.employee.findFirst({ where: { id: rest.issuedTo, entityId } });
        if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
        employeeId = rest.issuedTo;
        issuedTo = `${employee.firstName} ${employee.lastName}`;
      } else if (rest.type === 'project') {
        const project = await this.prisma.project.findFirst({ where: { id: rest.issuedTo, entityId } });
        if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
        projectId = rest.issuedTo;
        issuedTo = project.name;
      } else if (rest.type === 'department') {
        const department = await this.prisma.department.findFirst({ where: { id: rest.issuedTo, entityId } });
        if (!department) throw new HttpException('Department not found', HttpStatus.NOT_FOUND);
        departmentId = rest.issuedTo;
        issuedTo = department.name;
      }

      const results = await this.prisma.$transaction(async (tx) => {
        const createdIssues = [] as any[];
        for (const item of items) {
          const supply = await tx.storeSupply.findFirst({ where: { id: item.supplyId, entityId } });
          if (!supply) throw new HttpException(`Supply not found for ID: ${item.supplyId}`, HttpStatus.NOT_FOUND);
          if (supply.quantity < item.quantity) throw new HttpException(`Insufficient quantity for: ${supply.name}`, HttpStatus.BAD_REQUEST);

          const issue = await tx.supplyIssueHistory.create({
            data: {
              supplyId: item.supplyId,
              quantity: item.quantity,
              issuedTo,
              type: rest.type,
              purpose: rest.purpose,
              issuedById: rest.issuedById,
              notes: rest.notes,
              issueDate: rest.issueDate,
              entityId,
              groupId,
              employeeId,
              projectId,
              departmentId,
            },
          });

          await tx.storeSupply.update({
            where: { id: item.supplyId },
            data: { quantity: supply.quantity - item.quantity },
          });

          createdIssues.push(issue);
        }
        return createdIssues;
      });

      return { data: results, message: 'Supplies issued successfully', statusCode: 201 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(entityId: string, query: { page?: number; limit?: number; search?: string; projectId?: string }) {
    try {
      const { page = 1, limit = 10, search, projectId } = query;
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      if (projectId) where.projectId = projectId;
      if (search) {
        const textFilter = { contains: search, mode: 'insensitive' };
        where.OR = [
          { issuedTo: textFilter },
          { type: textFilter },
          { purpose: textFilter },
          { issueDate: { equals: search } },
          { supply: { name: textFilter } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.supplyIssueHistory.findMany({
          where,
          skip: Number(skip),
          take: Number(limit),
          orderBy: { issueDate: 'desc' },
          include: {
            supply: true,
            employee: true,
            issuedBy: true,
            updatedBy: true,
          },
        }),
        this.prisma.supplyIssueHistory.count({ where }),
      ]);

      return {
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, entityId: string) {
    try {
      const issue = await this.prisma.supplyIssueHistory.findFirst({ where: { id, entityId } });
      if (!issue) throw new HttpException('Issue not found', HttpStatus.NOT_FOUND);
      return issue;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateDto: UpdateIssueHistoryDto, entityId: string) {
    try {
      const issue = await this.prisma.supplyIssueHistory.findFirst({ where: { id, entityId } });
      if (!issue) throw new HttpException('Issue not found', HttpStatus.NOT_FOUND);

      let employeeId: string | null = issue.employeeId;
      let issuedTo = updateDto.issuedTo || issue.issuedTo;
      if (updateDto.type === 'employee' && updateDto.issuedTo) {
        const employee = await this.prisma.employee.findFirst({ where: { id: updateDto.issuedTo, entityId } });
        if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
        employeeId = updateDto.issuedTo;
        issuedTo = employee.firstName + ' ' + employee.lastName;
      }

      // Handle quantity change
      let quantityAdjustment = 0;
      if (updateDto.quantity !== undefined && updateDto.quantity !== issue.quantity) {
        quantityAdjustment = issue.quantity - updateDto.quantity; // positive means return to stock, negative means take more
        const supply = await this.prisma.storeSupply.findFirst({ where: { id: issue.supplyId, entityId } });
        if (!supply) throw new HttpException('Supply not found', HttpStatus.NOT_FOUND);
        const newQuantity = supply.quantity + quantityAdjustment;
        if (newQuantity < 0) throw new HttpException('Insufficient quantity in stock for the updated quantity', HttpStatus.BAD_REQUEST);
        await this.prisma.storeSupply.update({
          where: { id: issue.supplyId },
          data: { quantity: newQuantity },
        });
      }

      return await this.prisma.supplyIssueHistory.update({
        where: { id },
        data: {
          ...updateDto,
          issuedTo,
          employeeId,
        },
      });
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const issue = await this.prisma.supplyIssueHistory.findFirst({ where: { id, entityId } });
      if (!issue) throw new HttpException('Issue not found', HttpStatus.NOT_FOUND);
      await this.prisma.supplyIssueHistory.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
