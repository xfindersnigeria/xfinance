import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StoreItemsType } from 'prisma/generated/enums';

export class CreateStoreItemDto {
  @ApiProperty({ example: 'Office Chair', description: 'Item name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Furniture', description: 'Item category' })
  @IsString()
  categoryId: string = '';

  @ApiPropertyOptional({
    example: 'SKU-001',
    description: 'Stock keeping unit',
  })
  @IsOptional()
  @IsString()
  sku?: string = '';

  @ApiPropertyOptional({ example: 'pieces', description: 'Unit of measure' })
  @IsString()
  unitId: string = '';

  @ApiProperty({
    example: 'Comfortable office chair for work',
    description: 'Item description',
  })
  @IsString()
  description: string = '';

  @ApiPropertyOptional({
    example: 25000,
    description: 'Selling price in cents',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sellingPrice?: number;

  @ApiPropertyOptional({ example: 15000, description: 'Cost price in cents' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  costPrice?: number;

  @ApiPropertyOptional({ example: 10, description: 'Tax rate percentage' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rate?: number;

  @ApiPropertyOptional({ example: true, description: 'Is item taxable' })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiPropertyOptional({ example: 50, description: 'Current stock quantity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currentStock?: number;

  @ApiPropertyOptional({ example: 10, description: 'Low stock threshold' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lowStock?: number;

  @ApiPropertyOptional({
    enum: StoreItemsType,
    example: 'product',
    description: 'Item type',
  })
  @IsOptional()
  @IsEnum(StoreItemsType)
  type?: StoreItemsType;

  @ApiPropertyOptional({
    example: true,
    description: 'Is item sellable online',
  })
  @IsOptional()
  @IsBoolean()
  sellOnline?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Track inventory for this item',
  })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;
}

export class StoreItemDto extends CreateStoreItemDto {
  @ApiProperty({ example: 'item_uuid' })
  id: string = '';

  @ApiProperty({
    example: 'in_stock',
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    description: 'Stock status based on currentStock vs lowStock',
  })
  status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';

  @ApiPropertyOptional({
    example: 25000,
    description: 'Unit price (sellingPrice)',
  })
  unitPrice?: number;
}
