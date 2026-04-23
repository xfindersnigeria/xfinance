import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  private calculateLeaveDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const timeDiff = end.getTime() - start.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24) + 1); // +1 to include both start and end dates
    return dayDiff;
  }

  async createLeave(body: CreateLeaveDto, entityId: string, groupId: string) {
    try {
      // Validate that endDate is after startDate
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);

      if (endDate <= startDate) {
        throw new HttpException(
          'End date must be after start date',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Calculate days
      const days = this.calculateLeaveDays(startDate, endDate);

      // Verify employee exists and belongs to entity
      const employee = await this.prisma.employee.findUnique({
        where: { id: body.employeeId },
      });

      if (!employee) {
        throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      }

      if (employee.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to create leave for this employee',
          HttpStatus.FORBIDDEN,
        );
      }

      // Create leave record
      const leave = await this.prisma.leave.create({
        data: {
          employeeId: body.employeeId,
          leaveType: body.leaveType,
          startDate,
          endDate,
          reason: body.reason,
          contact: body.contact,
          emergencyContact: body.emergencyContact,
          days,
          status: body.status || 'Pending',
          entityId,
          groupId,
        },
        include: {
          employee: true,
        },
      });

      return leave;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getAllLeaveForEntity(
    entityId: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * limit;

      const whereClause: any = { entityId };
      if (status) {
        whereClause.status = status;
      }

      const [leaves, totalCount] = await Promise.all([
        this.prisma.leave.findMany({
          where: whereClause,
          include: {
            employee: true,
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.leave.count({ where: whereClause }),
      ]);

      // Calculate stats
      const [totalRequests, totalPending, totalApproved, totalRejected] =
        await Promise.all([
          this.prisma.leave.count({ where: { entityId } }),
          this.prisma.leave.count({
            where: { entityId, status: 'Pending' },
          }),
          this.prisma.leave.count({
            where: { entityId, status: 'Approved' },
          }),
          this.prisma.leave.count({
            where: { entityId, status: 'Rejected' },
          }),
        ]);

      // Calculate total days for all leave requests (approved or pending)
      const allLeaves = await this.prisma.leave.findMany({
        where: {
          entityId,
        },
      });

      const totalDaysRequested = allLeaves.reduce(
        (sum, leave) => sum + leave.days,
        0,
      );

      const totalPages = Math.ceil(totalCount / limit);

      return {
        leaves,
        stats: {
          totalRequests,
          totalPending,
          totalApproved,
          totalRejected,
          totalDaysRequested,
        },
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      };
    } catch (error) {
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getLeaveById(leaveId: string, entityId: string) {
    try {
      const leave = await this.prisma.leave.findUnique({
        where: { id: leaveId },
        include: {
          employee: true,
        },
      });

      if (!leave) {
        throw new HttpException('Leave record not found', HttpStatus.NOT_FOUND);
      }

      if (leave.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this leave record',
          HttpStatus.FORBIDDEN,
        );
      }

      return leave;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async updateLeave(leaveId: string, entityId: string, body: UpdateLeaveDto) {
    try {
      const leave = await this.prisma.leave.findUnique({
        where: { id: leaveId },
      });

      if (!leave) {
        throw new HttpException('Leave record not found', HttpStatus.NOT_FOUND);
      }

      if (leave.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this leave record',
          HttpStatus.FORBIDDEN,
        );
      }

      // If dates are being updated, recalculate days
      let days = leave.days;
      if (body.startDate || body.endDate) {
        const startDate = body.startDate
          ? new Date(body.startDate)
          : leave.startDate;
        const endDate = body.endDate ? new Date(body.endDate) : leave.endDate;

        if (endDate <= startDate) {
          throw new HttpException(
            'End date must be after start date',
            HttpStatus.BAD_REQUEST,
          );
        }

        days = this.calculateLeaveDays(startDate, endDate);
      }

      const updatedLeave = await this.prisma.leave.update({
        where: { id: leaveId },
        data: {
          leaveType: body.leaveType,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          reason: body.reason,
          contact: body.contact,
          emergencyContact: body.emergencyContact,
          status: body.status,
          days,
        },
        include: {
          employee: true,
        },
      });

      return updatedLeave;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteLeave(leaveId: string, entityId: string) {
    try {
      const leave = await this.prisma.leave.findUnique({
        where: { id: leaveId },
      });

      if (!leave) {
        throw new HttpException('Leave record not found', HttpStatus.NOT_FOUND);
      }

      if (leave.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this leave record',
          HttpStatus.FORBIDDEN,
        );
      }

      await this.prisma.leave.delete({
        where: { id: leaveId },
      });

      return { success: true, message: 'Leave record deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async changeLeaveStatus(leaveId: string, entityId: string, status: string) {
    try {
      const leave = await this.prisma.leave.findUnique({
        where: { id: leaveId },
      });

      if (!leave) {
        throw new HttpException('Leave record not found', HttpStatus.NOT_FOUND);
      }

      if (leave.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this leave record',
          HttpStatus.FORBIDDEN,
        );
      }

      // Validate status is one of the allowed values
      const validStatuses = ['Pending', 'Approved', 'Rejected'];
      if (!validStatuses.includes(status)) {
        throw new HttpException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedLeave = await this.prisma.leave.update({
        where: { id: leaveId },
        data: { status: status as any },
        include: {
          employee: true,
        },
      });

      return updatedLeave;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }
}
