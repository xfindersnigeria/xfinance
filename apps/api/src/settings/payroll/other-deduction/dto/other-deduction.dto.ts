import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum OtherDeductionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum DeductionStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateOtherDeductionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(OtherDeductionType)
  type: OtherDeductionType;

  @IsNumber()
  rate: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DeductionStatus)
  status?: DeductionStatus;
}

export class UpdateOtherDeductionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(OtherDeductionType)
  type?: OtherDeductionType;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DeductionStatus)
  status?: DeductionStatus;
}
