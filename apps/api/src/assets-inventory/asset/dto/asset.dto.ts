import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ example: 'Toyota Hilux 2024', description: 'Name of the asset' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'clx...', description: 'Asset category id — drives the depreciation rate' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 'in_use', enum: ['in_use', 'in_storage'] })
  @IsIn(['in_use', 'in_storage'])
  @IsOptional()
  status?: 'in_use' | 'in_storage';

  @ApiProperty({ example: '2024-03-25', description: 'Purchase date of the asset' })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ example: 15000000, description: 'Purchase cost of the asset' })
  @IsInt()
  @Min(0)
  purchaseCost: number;

  @ApiPropertyOptional({
    example: 7200000,
    description:
      'Accumulated depreciation from previous books as at the start of the current fiscal year. ' +
      'Only applies to assets bought before the current fiscal year; otherwise computed from purchase date.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  openingAccumulatedDepreciation?: number | null;

  // ── Optional legacy fields (kept so existing API callers keep working) ──

  @ApiPropertyOptional({ description: 'Department id' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Employee id assigned to asset' })
  @IsString()
  @IsOptional()
  assignedId?: string;

  @ApiPropertyOptional({ example: 'Short note..' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2025-03-25', description: 'Warranty expiry date' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Deprecated — use status' })
  @IsBoolean()
  @IsOptional()
  activeAsset?: boolean;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
