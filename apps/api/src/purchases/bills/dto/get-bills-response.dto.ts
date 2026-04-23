import { ApiProperty } from '@nestjs/swagger';
import { BillDto } from './bill.dto';

export class GetBillsResponseDto {
  @ApiProperty({
    type: [BillDto],
    description: 'List of bills for the entity',
  })
  bills: BillDto[];

  @ApiProperty({
    example: 25,
    description: 'Total number of bills matching the filter',
  })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number;
}
