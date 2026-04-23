import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StatutoryDeductionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  TIERED = 'TIERED',
}

export enum DeductionStatus {
  active = 'active',
  inactive = 'inactive',
}

export class TaxTierDto {
  @IsNumber()
  @Min(0)
  from: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  to?: number;

  @IsNumber()
  @Min(0)
  rate: number;
}

export class CreateStatutoryDeductionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(StatutoryDeductionType)
  type: StatutoryDeductionType;

  // PERCENTAGE only
  @IsOptional()
  @IsNumber()
  rate?: number;

  // FIXED_AMOUNT only
  @IsOptional()
  @IsNumber()
  fixedAmount?: number;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  // TIERED only
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxTierDto)
  tiers?: TaxTierDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(DeductionStatus)
  status?: DeductionStatus;
}

export class UpdateStatutoryDeductionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(StatutoryDeductionType)
  type?: StatutoryDeductionType;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsNumber()
  fixedAmount?: number;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxTierDto)
  tiers?: TaxTierDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(DeductionStatus)
  status?: DeductionStatus;
}
