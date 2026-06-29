import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsPositive,
  MinLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class BudgetLineDto {
  @ApiProperty({ example: 'clxyzacc001', description: 'Account ID (entity budgets)', required: false })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ example: 'clxyzsub001', description: 'Sub-category ID (group budgets)', required: false })
  @IsString()
  @IsOptional()
  subCategoryId?: string;

  @ApiProperty({
    example: 250000,
    description: 'Budget amount in cents (e.g. 250000 = 2500.00)',
  })
  @IsInt()
  @IsPositive()
  amount: number;
}

export class CreateBulkBudgetDto {
  @ApiProperty({ example: 'Q1 Marketing 2025', description: 'Budget name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Quarterly', enum: ['Monthly', 'Quarterly', 'Yearly', 'Custom'] })
  @IsString()
  @IsNotEmpty()
  periodType: string;

  @ApiProperty({ example: 'November', required: false })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ example: '2025' })
  @IsString()
  @IsNotEmpty()
  fiscalYear: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ type: [BudgetLineDto] })
  @IsArray()
  lines: BudgetLineDto[];
}

export class UpdateBulkBudgetDto extends PartialType(CreateBulkBudgetDto) {}
