import { ApiProperty } from '@nestjs/swagger';
import { PaymentDto } from './payment.dto';

export class GetPaymentsResponseDto {
  @ApiProperty({ type: [PaymentDto], description: 'List of payments' })
  payments: PaymentDto[];

  @ApiProperty({
    example: 25,
    description: 'Total number of payments matching the filter',
  })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number;
}
