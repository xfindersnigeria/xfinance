import { ApiProperty } from '@nestjs/swagger';
import { ItemDto } from './create-item.dto';

export class GetItemsResponseDto {
  @ApiProperty({
    type: [ItemDto],
    description: 'List of items with stock status and unit price',
  })
  items: ItemDto[];

  @ApiProperty({ example: 50, description: 'Total number of items' })
  total: number;

  // @ApiProperty({
  //   example: 45,
  //   description: 'Total items in stock (currentStock > lowStock)',
  // })
  // totalInStock: number;

  // @ApiProperty({
  //   example: 5,
  //   description: 'Total items out of stock (currentStock <= lowStock)',
  // })
  // totalOutOfStock: number;
  @ApiProperty({ example: 6, description: 'Total number of items across all types' })
  totalItems: number;

  // @ApiProperty({ example: 6, description: 'Total active items' })
  // activeItems: number;

  @ApiProperty({ example: 4, description: 'Total service items' })
  serviceItems: number;

  @ApiProperty({ example: 2, description: 'Total goods items' })
  goodsItems: number;

  @ApiProperty({ example: 55000, description: 'Average unit price across returned items' })
  avgPrice: number;
  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}
