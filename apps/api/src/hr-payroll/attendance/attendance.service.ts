import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendanceBatch(
    body: BatchCreateAttendanceDto,
    entityId: string,
    groupId: string,
    isDraft = false,
  ) {
    try {
      const attendanceDate = new Date(body.date);
      attendanceDate.setHours(0, 0, 0, 0);

      const toDate = (s?: string) => {
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };

      // Upsert the log; block re-marking a submitted log
      const existingLog = await this.prisma.attendanceLog.findUnique({
        where: { date_entityId: { date: attendanceDate, entityId } },
      });

      if (existingLog?.status === 'Submitted') {
        throw new ForbiddenException(
          'Attendance for this date has already been submitted and cannot be modified',
        );
      }

      const newStatus = isDraft ? 'Draft' : 'Submitted';

      const attendanceLog = await this.prisma.attendanceLog.upsert({
        where: { date_entityId: { date: attendanceDate, entityId } },
        create: { date: attendanceDate, entityId, groupId, status: newStatus },
        update: { status: newStatus },
      });

      // Upsert each attendance record
      const existing = await this.prisma.attendance.findMany({
        where: {
          attendanceLogId: attendanceLog.id,
          employeeId: { in: body.attendances.map((a) => a.employeeId) },
        },
        select: { id: true, employeeId: true },
      });
      const existingMap = new Map(existing.map((r) => [r.employeeId, r.id]));

      const attendances = await Promise.all(
        body.attendances.map((record) => {
          const existingId = existingMap.get(record.employeeId);
          const data = {
            status: record.status,
            checkInTime: toDate(record.checkInTime),
            checkOutTime: toDate(record.checkOutTime),
            notes: record.note,
            asdraft: isDraft,
          };

          if (existingId) {
            return this.prisma.attendance.update({
              where: { id: existingId },
              data,
              include: { employee: true },
            });
          }

          return this.prisma.attendance.create({
            data: {
              ...data,
              employeeId: record.employeeId,
              attendanceLogId: attendanceLog.id,
              entityId,
              groupId,
            },
            include: { employee: true },
          });
        }),
      );

      return { attendanceLog, attendances };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getAttendanceLogByDate(date: string, entityId: string) {
    try {
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      const attendanceLog = await this.prisma.attendanceLog.findUnique({
        where: { date_entityId: { date: attendanceDate, entityId } },
        include: {
          attendances: {
            include: { employee: true },
          },
        },
      });

      // Return null (not a 404) so the form can show an empty state
      return { data: attendanceLog ?? null };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getEmployeeAttendanceHistory(
    employeeId: string,
    entityId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [attendances, totalCount] = await Promise.all([
        this.prisma.attendance.findMany({
          where: { employeeId, entityId },
          include: { employee: true, attendanceLog: true },
          skip,
          take: Number(limit),
          orderBy: { attendanceLog: { date: 'desc' } },
        }),
        this.prisma.attendance.count({ where: { employeeId, entityId } }),
      ]);

      return {
        attendances,
        pagination: {
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          limit,
        },
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getAttendanceById(attendanceId: string, entityId: string) {
    try {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { employee: true, attendanceLog: true },
      });

      if (!attendance) {
        throw new HttpException('Attendance record not found', HttpStatus.NOT_FOUND);
      }

      if (attendance.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this attendance record',
          HttpStatus.FORBIDDEN,
        );
      }

      return attendance;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateAttendance(
    attendanceId: string,
    entityId: string,
    body: UpdateAttendanceDto,
  ) {
    try {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { attendanceLog: true },
      });

      if (!attendance) {
        throw new HttpException('Attendance record not found', HttpStatus.NOT_FOUND);
      }

      if (attendance.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this attendance record',
          HttpStatus.FORBIDDEN,
        );
      }

      if (attendance.attendanceLog.status === 'Submitted') {
        throw new ForbiddenException(
          'Submitted attendance records cannot be modified',
        );
      }

      return this.prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          status: body.status,
          checkInTime: body.checkInTime ? new Date(body.checkInTime) : undefined,
          checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : undefined,
          notes: body.note,
        },
        include: { employee: true, attendanceLog: true },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteAttendanceLog(attendanceLogId: string, entityId: string) {
    try {
      const attendanceLog = await this.prisma.attendanceLog.findUnique({
        where: { id: attendanceLogId },
      });

      if (!attendanceLog) {
        throw new HttpException('Attendance log not found', HttpStatus.NOT_FOUND);
      }

      if (attendanceLog.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this attendance log',
          HttpStatus.FORBIDDEN,
        );
      }

      await this.prisma.attendanceLog.delete({ where: { id: attendanceLogId } });
      return { success: true, message: 'Attendance log deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private calculateHours(checkInTime: Date | null, checkOutTime: Date | null): number {
    if (!checkInTime || !checkOutTime) return 0;
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  private enrichAttendanceWithHours(attendances: any[]) {
    return attendances.map((att) => ({
      ...att,
      hoursWorked: this.calculateHours(att.checkInTime, att.checkOutTime),
    }));
  }

  async getAllEntityAttendance(
    entityId: string,
    date?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * Number(limit);

      const whereClause: any = { entityId };
      if (date) {
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(attendanceDate);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.attendanceLog = { date: { gte: attendanceDate, lt: nextDay } };
      }

      const [attendances, totalCount] = await Promise.all([
        this.prisma.attendance.findMany({
          where: whereClause,
          include: { employee: true, attendanceLog: true },
          skip,
          take: Number(limit),
          orderBy: { attendanceLog: { date: 'desc' } },
        }),
        this.prisma.attendance.count({ where: whereClause }),
      ]);

      // Stats — always scoped to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);

      const [todayAttendances, totalEmployees] = await Promise.all([
        this.prisma.attendance.findMany({
          where: {
            entityId,
            attendanceLog: { date: { gte: today, lt: nextDay } },
          },
        }),
        this.prisma.employee.count({ where: { entityId, status: 'Active' } }),
      ]);

      const totalPresentToday = todayAttendances.filter(
        (a) => a.status?.toLowerCase() === 'present',
      ).length;
      const totalOnLeaveToday = todayAttendances.filter(
        (a) => a.status?.toLowerCase() === 'on leave',
      ).length;
      const totalAbsentToday = todayAttendances.filter(
        (a) => a.status?.toLowerCase() === 'absent',
      ).length;
      const presentPercentage =
        totalEmployees > 0 ? Math.round((totalPresentToday / totalEmployees) * 100) : 0;

      // Average hours this month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      const monthAttendances = await this.prisma.attendance.findMany({
        where: {
          entityId,
          attendanceLog: { date: { gte: monthStart, lt: monthEnd } },
          checkInTime: { not: null },
          checkOutTime: { not: null },
        },
      });

      const totalHoursMonth = monthAttendances.reduce(
        (sum, att) => sum + this.calculateHours(att.checkInTime, att.checkOutTime),
        0,
      );
      const averageHoursMonth =
        monthAttendances.length > 0
          ? Math.round((totalHoursMonth / monthAttendances.length) * 100) / 100
          : 0;

      return {
        attendances: this.enrichAttendanceWithHours(attendances),
        stats: {
          totalPresentToday,
          totalOnLeaveToday,
          totalAbsentToday,
          totalEmployees,
          presentPercentage,
          averageHoursMonth,
        },
        pagination: {
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
          currentPage: page,
          limit: Number(limit),
        },
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
