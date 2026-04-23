import { ApiProperty } from '@nestjs/swagger';
import { StoreItemDto } from './create-store-item.dto';

export class GetStoreItemsResponseDto {
  @ApiProperty({
    type: [StoreItemDto],
    description: 'List of items with stock status and unit price',
  })
  items: StoreItemDto[];

  @ApiProperty({ example: 50, description: 'Total number of items' })
  total: number;

  @ApiProperty({
    example: 45,
    description: 'Total items in stock (currentStock > lowStock)',
  })
  totalInStock: number;

  @ApiProperty({
    example: 5,
    description: 'Total items out of stock (currentStock <= lowStock)',
  })
  totalOutOfStock: number;

  @ApiProperty({ example: 125000, description: 'Total inventory value (currentStock * costPrice)' })
  totalValue: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}
