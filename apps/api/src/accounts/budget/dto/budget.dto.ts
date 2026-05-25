import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BudgetLineDto {
  @ApiProperty({ example: 'clxyzacc001', description: 'Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: 250000,
    description: 'Budget amount in cents (e.g. 250000 = 2500.00)',
  })
  @IsInt()
  @IsPositive()
  amount: number;
}

export class CreateBulkBudgetDto {
  @ApiProperty({
    example: 'Q1 Marketing 2025',
    description: 'Name for all budgets in this batch',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Quarterly',
    description: 'Period type — same for all records',
    enum: ['Monthly', 'Quarterly', 'Yearly', 'Custom'],
  })
  @IsString()
  @IsNotEmpty()
  periodType: string;

  @ApiProperty({
    example: 'November',
    description: 'Period value: month name, quarter (Q1-Q4), or fiscal year for yearly budgets',
    required: false,
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ example: '2025', description: 'Fiscal year — same for all' })
  @IsString()
  @IsNotEmpty()
  fiscalYear: string;

  @ApiProperty({ example: 'Q1 digital & events budget', required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    type: [BudgetLineDto],
    description:
      'Array of account + amount pairs. One Budget record created per item.',
  })
  @IsArray()
  lines: BudgetLineDto[];
}
