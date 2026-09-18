import { PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const TAX_RATE_TYPES = ['VAT', 'Sales Tax', 'Withholding Tax', 'Other'] as const;

export class UpdateTaxConfigDto {
  @IsOptional() @IsBoolean() taxCalculation?: boolean;
  @IsOptional() @IsBoolean() taxInclusive?: boolean;
  @IsOptional() @IsBoolean() compoundTax?: boolean;
  @IsOptional() @IsBoolean() reverseChargeVat?: boolean;
}

export class CreateTaxRateDto {
  @IsString() @IsNotEmpty() name: string;
  @IsIn(TAX_RATE_TYPES as unknown as string[]) type: string;
  @IsNumber() @Min(0) @Max(100) rate: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() jurisdictionId?: string | null;
}
export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {}

export class CreateTaxGroupDto {
  @IsString() @IsNotEmpty() name: string;
  // In application order — matters for compound tax
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) taxRateIds: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateTaxGroupDto extends PartialType(CreateTaxGroupDto) {}

export class CreateTaxExemptionDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() code: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateTaxExemptionDto extends PartialType(CreateTaxExemptionDto) {}

export class CreateTaxJurisdictionDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  // ISO alpha-2; empty clears it
  @IsOptional() @IsString() @Matches(/^([A-Za-z]{2})?$/, { message: 'countryCode must be a 2-letter country code' })
  countryCode?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateTaxJurisdictionDto extends PartialType(CreateTaxJurisdictionDto) {}
