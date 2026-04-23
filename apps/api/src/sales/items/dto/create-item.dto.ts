import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemsType } from 'prisma/generated/enums';

export class CreateItemDto {
  @ApiProperty({ example: 'Office Chair', description: 'Item name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Office Chair', description: 'Item name' })
  @IsString()
  code: string = '';

  @ApiProperty({ example: 'Furniture', description: 'Item category' })
  @IsString()
  category: string = '';


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
  unitPrice?: number;

  

  @ApiPropertyOptional({ example: true, description: 'Is item taxable' })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  

  @ApiPropertyOptional({
    enum: ItemsType,
    example: 'product',
    description: 'Item type',
  })
  @IsOptional()
  @IsEnum(ItemsType)
  type?: ItemsType;

  

  @ApiProperty({ example: 'acc-income-123', description: 'Income account ID for this item' })
  @IsString()
  incomeAccountId: string;

}

export class ItemDto extends CreateItemDto {
  @ApiProperty({ example: 'item_uuid' })
  id: string = '';

  @ApiProperty({
    example: 'in_stock',
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    description: 'Stock status based on currentStock vs lowStock',
  })
  status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';

}
