import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PayrollStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export class PayrollEmployeeDto {
  @IsNotEmpty() @IsString() employeeId: string;
  @IsNumber() basicSalary: number;
  @IsOptional() @IsNumber() allowances?: number;
  @IsOptional() @IsNumber() bonus?: number;
  @IsOptional() @IsNumber() overtime?: number;
  @IsOptional() @IsNumber() statutoryDed?: number;
  @IsOptional() @IsNumber() otherDed?: number;
}

export class CreatePayrollBatchDto {
  @IsNotEmpty() @IsString() batchName: string;
  @IsNotEmpty() @IsString() period: string;
  @IsDateString() paymentDate: string;
  @IsNotEmpty() @IsString() paymentMethod: string;
  @IsOptional() @IsEnum(PayrollStatus) status?: PayrollStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollEmployeeDto)
  employees: PayrollEmployeeDto[];
}

export class ChangePayrollStatusDto {
  @IsEnum(PayrollStatus) status: PayrollStatus;
}

export class UpdatePayrollBatchDto {
  @IsOptional() @IsString() batchName?: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsDateString() paymentDate?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollEmployeeDto)
  employees?: PayrollEmployeeDto[];
}
