import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveStatus } from 'prisma/generated/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveDto {
  @ApiProperty({
    example: 'emp_123',
    description: 'Employee ID',
  })
  @IsString()
  employeeId: string;

  @ApiProperty({
    example: 'Vacation',
    description: 'Type of leave (Vacation, Sick, Personal, etc.)',
  })
  @IsString()
  leaveType: string;

  @ApiProperty({
    example: '2026-02-15T00:00:00Z',
    description: 'Leave start date',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-02-20T00:00:00Z',
    description: 'Leave end date',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: 'Family vacation',
    description: 'Reason for leave',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    example: '+1-555-0100',
    description: 'Contact number during leave',
  })
  @IsString()
  contact: string;

  @ApiProperty({
    example: '+1-555-0101',
    description: 'Emergency contact number',
  })
  @IsString()
  emergencyContact: string;

  @ApiPropertyOptional({
    example: LeaveStatus.Pending,
    enum: LeaveStatus,
    description: 'Leave status (defaults to Pending)',
  })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;
}

export class UpdateLeaveDto {
  @ApiPropertyOptional({
    example: 'Vacation',
    description: 'Type of leave',
  })
  @IsOptional()
  @IsString()
  leaveType?: string;

  @ApiPropertyOptional({
    example: '2026-02-15T00:00:00Z',
    description: 'Leave start date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-02-20T00:00:00Z',
    description: 'Leave end date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'Family vacation',
    description: 'Reason for leave',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: '+1-555-0100',
    description: 'Contact number during leave',
  })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({
    example: '+1-555-0101',
    description: 'Emergency contact number',
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({
    example: LeaveStatus.Approved,
    enum: LeaveStatus,
    description: 'Leave status',
  })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;
}

export class ChangeLeaveStatusDto {
  @ApiProperty({
    example: LeaveStatus.Approved,
    enum: LeaveStatus,
    description: 'New leave status (Approved, Rejected, Pending)',
  })
  @IsEnum(LeaveStatus)
  status: LeaveStatus;
}
