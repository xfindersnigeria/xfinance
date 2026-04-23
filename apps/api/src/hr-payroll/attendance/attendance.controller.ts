import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Attendance')
@Controller('hr-payroll/attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly bullmqService: BullmqService,
  ) {}

  @Post('batch')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Mark attendance for multiple employees on a specific date',
  })
  @ApiBody({ type: BatchCreateAttendanceDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description: 'Attendance marked successfully for all employees',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async markAttendanceBatch(
    @Body() body: BatchCreateAttendanceDto,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req) as string;

    // Drafts are saved synchronously so the form gets immediate feedback.
    // Final submissions go through BullMQ for background processing.
    if (body.isDraft) {
      const result = await this.attendanceService.markAttendanceBatch(
        body,
        entityId,
        groupId,
        true,
      );
      return { data: result, message: 'Draft saved successfully', statusCode: 200 };
    }

    await this.bullmqService.addJob('mark-attendance-batch', {
      date: body.date,
      attendances: body.attendances,
      entityId,
      groupId,
      isDraft: false,
    });

    return {
      data: null,
      message: 'Attendance submission queued and will be processed shortly',
      statusCode: 202,
    };
  }

  @Get('log')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all attendance records for a specific date',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    type: 'string',
    example: '2026-02-10',
    description: 'Date in YYYY-MM-DD format',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description: 'Attendance log with all employee records for the date',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({
    description: 'No attendance records found for this date',
  })
  async getAttendanceLogByDate(@Query('date') date: string, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.attendanceService.getAttendanceLogByDate(date, entityId);
  }

  @Get('employee/:employeeId')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get attendance history for a specific employee (paginated)',
  })
  @ApiParam({
    name: 'employeeId',
    description: 'Employee ID',
    type: 'string',
  })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description: 'Attendance history with pagination',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getEmployeeAttendanceHistory(
    @Param('employeeId') employeeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.attendanceService.getEmployeeAttendanceHistory(
      employeeId,
      entityId,
      page,
      limit,
    );
  }

  @Get(':attendanceId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a single attendance record by ID' })
  @ApiParam({
    name: 'attendanceId',
    description: 'Attendance Record ID',
    type: 'string',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Attendance record details' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Attendance record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access this attendance record',
  })
  async getAttendanceById(
    @Param('attendanceId') attendanceId: string,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.attendanceService.getAttendanceById(attendanceId, entityId);
  }

  @Patch(':attendanceId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a single attendance record' })
  @ApiParam({
    name: 'attendanceId',
    description: 'Attendance Record ID',
    type: 'string',
  })
  @ApiBody({ type: UpdateAttendanceDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Attendance record updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Attendance record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this attendance record',
  })
  async updateAttendance(
    @Param('attendanceId') attendanceId: string,
    @Body() body: UpdateAttendanceDto,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.attendanceService.updateAttendance(
      attendanceId,
      entityId,
      body,
    );
  }

  @Delete('log/:attendanceLogId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an entire attendance log (all employees for a date)',
  })
  @ApiParam({
    name: 'attendanceLogId',
    description: 'Attendance Log ID',
    type: 'string',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Attendance log deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Attendance log not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to delete this attendance log',
  })
  async deleteAttendanceLog(
    @Param('attendanceLogId') attendanceLogId: string,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.attendanceService.deleteAttendanceLog(
      attendanceLogId,
      entityId,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all entity attendance with filtering, pagination, and stats',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: 'string',
    example: '2026-02-10',
    description: 'Filter by specific date (YYYY-MM-DD format)',
  })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description:
      'All attendance records with stats (hours worked, present percentage, on leave, absent, average hours)',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getAllEntityAttendance(
    @Req() req,
    @Query('date') date?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.attendanceService.getAllEntityAttendance(
      entityId,
      date,
      page,
      limit,
    );
  }
}
