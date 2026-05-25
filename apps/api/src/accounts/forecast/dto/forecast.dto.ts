import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForecastLineDto {
  @ApiProperty({ example: 'clxyzacc001', description: 'Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: 250000,
    description: 'Forecast amount in cents',
  })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 5.0, description: 'Growth rate percentage', required: false })
  @IsOptional()
  @IsNumber()
  growthRate?: number;
}

export class CreateBulkForecastDto {
  @ApiProperty({ example: 'Q1 2026 Growth Projection', description: 'Forecast name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Quarterly', enum: ['Monthly', 'Quarterly', 'Yearly'] })
  @IsString()
  @IsNotEmpty()
  periodType: string;

  @ApiProperty({ example: 'Q1', description: 'Period value: month name, Q1-Q4, or empty for yearly', required: false })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiProperty({ example: '2026', description: 'Fiscal year' })
  @IsString()
  @IsNotEmpty()
  fiscalYear: string;

  @ApiProperty({ example: 'Medium', enum: ['High', 'Medium', 'Low'], required: false })
  @IsOptional()
  @IsString()
  confidenceLevel?: string;

  @ApiProperty({ example: 'manual', enum: ['manual', 'growth_rate', 'ai'], required: false })
  @IsOptional()
  @IsString()
  forecastMethod?: string;

  @ApiProperty({ example: 'Conservative projection based on Q3 trends', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [ForecastLineDto] })
  @IsArray()
  lines: ForecastLineDto[];
}
