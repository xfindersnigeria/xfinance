import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({
    example: 'emp_123',
    description: 'Employee ID',
  })
  @IsString()
  employeeId: string;

  @ApiProperty({
    example: 'Present',
    description: 'Attendance status (Present, Absent, Leave, Late, etc.)',
  })
  @IsString()
  status: string;

  @ApiPropertyOptional({
    example: '2026-02-10T09:00:00Z',
    description: 'Check-in time',
  })
  @IsOptional()
  // @IsDateString()
  checkInTime?: string;

  @ApiPropertyOptional({
    example: '2026-02-10T17:00:00Z',
    description: 'Check-out time',
  })
  @IsOptional()
  // @IsDateString()
  checkOutTime?: string;

  @ApiPropertyOptional({
    example: 'Worked from home',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BatchCreateAttendanceDto {
  @ApiProperty({
    example: '2026-02-10T00:00:00Z',
    description: 'Date for attendance marking',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [CreateAttendanceDto],
    description: 'Array of attendance records for employees',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  attendances: CreateAttendanceDto[];

  @ApiPropertyOptional({ example: true, description: 'Save as draft instead of submitting' })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class UpdateAttendanceDto {
  @ApiPropertyOptional({
    example: 'Present',
    description: 'Attendance status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: '2026-02-10T09:00:00Z',
    description: 'Check-in time',
  })
  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @ApiPropertyOptional({
    example: '2026-02-10T17:00:00Z',
    description: 'Check-out time',
  })
  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  @ApiPropertyOptional({
    example: 'Updated note',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
