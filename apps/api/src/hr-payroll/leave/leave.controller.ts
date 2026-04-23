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
import { LeaveService } from './leave.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import {
  CreateLeaveDto,
  UpdateLeaveDto,
  ChangeLeaveStatusDto,
} from './dto/leave.dto';
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

@ApiTags('Leave Management')
@Controller('hr-payroll/leave')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a leave request (days auto-calculated from startDate to endDate)',
  })
  @ApiBody({ type: CreateLeaveDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description: 'Leave request created successfully with calculated days',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to create leave for this employee',
  })
  async createLeave(@Body() body: CreateLeaveDto, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req) as string;
    return this.leaveService.createLeave(body, entityId, groupId);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all leave requests for an entity with filtering and stats',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    example: 'Pending',
    description: 'Filter by leave status (Pending, Approved, Rejected)',
  })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description:
      'Leave requests with stats (totalRequests, totalPending, totalApproved, totalRejected, totalDaysRequested)',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getAllLeave(
    @Req() req,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.leaveService.getAllLeaveForEntity(
      entityId,
      status,
      page,
      limit,
    );
  }

  @Get(':leaveId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a single leave request by ID' })
  @ApiParam({
    name: 'leaveId',
    description: 'Leave Request ID',
    type: 'string',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Leave request details' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Leave record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access this leave record',
  })
  async getLeaveById(@Param('leaveId') leaveId: string, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.leaveService.getLeaveById(leaveId, entityId);
  }

  @Patch(':leaveId')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Update a leave request (days auto-recalculated if dates change)',
  })
  @ApiParam({
    name: 'leaveId',
    description: 'Leave Request ID',
    type: 'string',
  })
  @ApiBody({ type: UpdateLeaveDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Leave request updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Leave record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this leave record',
  })
  async updateLeave(
    @Param('leaveId') leaveId: string,
    @Body() body: UpdateLeaveDto,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.leaveService.updateLeave(leaveId, entityId, body);
  }

  @Delete(':leaveId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a leave request' })
  @ApiParam({
    name: 'leaveId',
    description: 'Leave Request ID',
    type: 'string',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Leave request deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Leave record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to delete this leave record',
  })
  async deleteLeave(@Param('leaveId') leaveId: string, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.leaveService.deleteLeave(leaveId, entityId);
  }

  @Patch(':leaveId/status')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Change leave request status (Approved, Rejected, Pending)',
  })
  @ApiParam({
    name: 'leaveId',
    description: 'Leave Request ID',
    type: 'string',
  })
  @ApiBody({ type: ChangeLeaveStatusDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Leave request status changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Leave record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this leave record',
  })
  async changeLeaveStatus(
    @Param('leaveId') leaveId: string,
    @Body() body: ChangeLeaveStatusDto,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.leaveService.changeLeaveStatus(leaveId, entityId, body.status);
  }
}
