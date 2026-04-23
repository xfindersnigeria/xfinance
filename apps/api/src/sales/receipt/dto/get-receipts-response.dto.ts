import { ApiProperty } from '@nestjs/swagger';

export class ReceiptListItemDto {
  @ApiProperty({ example: 'rec_abc123' })
  id: string;

  @ApiProperty({ example: '1234567890' })
  customerId: string;

  @ApiProperty({ example: '2025-12-18T00:00:00Z' })
  date: string;

  @ApiProperty({ example: 'Cash' })
  paymentMethod: string;

  @ApiProperty({ example: ['item 1', 'item 2'] })
  items: string[];

  @ApiProperty({ example: 5000 })
  total: number;

  @ApiProperty({ example: 'Void' })
  status: string;

  @ApiProperty({ example: '2025-12-18T00:00:00Z' })
  createdAt: string;
}

export class ReceiptsStatsDto {
  @ApiProperty({
    example: 50,
    description: 'Total number of receipts matching filter',
  })
  totalReceipts: number;

  @ApiProperty({
    example: 150000,
    description: 'Sum of totals for receipts matching filter',
  })
  totalSales: number;

  @ApiProperty({
    example: 5000,
    description: "Today's sales (sum of totals for today's receipts)",
  })
  todaysSales: number;

  @ApiProperty({
    example: 3000,
    description: 'Average receipt value for matching receipts',
  })
  averageReceiptValue: number;
}

export class GetReceiptsResponseDto {
  @ApiProperty({ type: [ReceiptListItemDto] })
  receipts: ReceiptListItemDto[];

  @ApiProperty({ type: ReceiptsStatsDto })
  stats: ReceiptsStatsDto;

  @ApiProperty({ example: 100, description: 'Total receipts matching filter' })
  totalCount: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
