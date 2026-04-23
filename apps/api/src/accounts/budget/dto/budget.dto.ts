import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BudgetLineDto {
  @ApiProperty({ example: 'clxyzacc001', description: 'Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: 250000,
    description: 'Budget amount for this account',
  })
  @IsInt()
  @IsNotEmpty()
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
    example: '2025-01',
    description: 'Month (if applicable)',
    required: false,
  })
  @IsString()
  month: string;

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
