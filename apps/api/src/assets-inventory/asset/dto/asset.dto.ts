import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
export class CreateAssetDto {
  @ApiProperty({ example: 'Dell laptop', description: 'Name of the asset' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ComputerEquipment', description: 'Asset type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'IT', description: 'Asset Department.' })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: 'employeeId', description: 'Employee id assigned to asset' })
  @IsString()
  @IsNotEmpty()
  assignedId: string;

  @ApiProperty({
    example: 'Short note..',
    description: 'Description of the asset',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '2024-03-25',
    description: 'Purchase date of the asset',
  })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ example: 5000, description: 'Purchase cost of the asset' })
  @IsInt()
  @Min(0)
  purchaseCost: number;

  @ApiProperty({ example: 10, description: 'Current value of the asset' })
  @IsInt()
  @Min(0)
  @IsOptional()
  currentValue?: number;

  @ApiProperty({
    example: '2025-03-25',
    description: 'Expiry date of the asset',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ example: 'Straight Line', description: 'Depreciation method' })
  @IsString()
  @IsOptional()
  depreciationMethod?: string;

  @ApiProperty({ example: 5, description: 'Number of years for depreciation' })
  @IsInt()
  @Min(0)
  @IsOptional()
  years?: number;

  @ApiProperty({ example: 10, description: 'Salvage value of the asset' })
  @IsInt()
  @Min(0)
  @IsOptional()
  salvageValue?: number;

  @ApiProperty({ example: true, description: 'Track depreciation' })
  @IsBoolean()
  trackDepreciation: boolean;

  @ApiProperty({ example: true, description: 'Is asset active?' })
  @IsBoolean()
  activeAsset: boolean;
}

export class UpdateAssetDto {
  @ApiPropertyOptional({
    example: 'Dell laptop',
    description: 'Name of the asset',
  })
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'ComputerEquipment',
    description: 'Asset type',
  })
  @IsString()
  type?: string; // e.g. "laptop", "vehicle", "furniture"

  @ApiPropertyOptional({ example: 'IT', description: 'Asset Department.' })
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'employeeId', description: 'Employee id assigned to asset' })
  @IsString()
  assignedId?: string;

  @ApiPropertyOptional({
    example: 'Short note..',
    description: 'Description of the asset',
  })
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '25-03-2024',
    description: 'Purchase date of the asset',
  })
  @IsDateString()
  purchaseDate?: string; // ISO string → Prisma converts to DateTime

  @ApiPropertyOptional({
    example: 5000,
    description: 'Purchase cost of the asset',
  })
  @IsInt()
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Current value of the asset',
  })
  @IsInt()
  @Min(0)
  currentValue?: number;

  @ApiPropertyOptional({
    example: '25-03-2025',
    description: 'Expiry date of the asset',
  })
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    example: 'Straight Line',
    description: 'Depreciation method',
  })
  @IsString()
  depreciationMethod?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of years for depreciation',
  })
  @IsInt()
  @Min(0)
  years?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Salvage value of the asset',
  })
  @IsInt()
  @Min(0)
  salvageValue?: number;
}
