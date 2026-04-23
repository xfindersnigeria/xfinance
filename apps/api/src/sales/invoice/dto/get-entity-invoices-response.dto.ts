import { ApiProperty } from '@nestjs/swagger';

export class InvoiceStatsDto {
  @ApiProperty({ example: 5, description: 'Total count for this status' })
  count: number;

  @ApiProperty({
    example: 15000,
    description: 'Total amount (sum) for this status',
  })
  total: number;
}

export class InvoiceAggregatesDto {
  @ApiProperty({ type: InvoiceStatsDto })
  sent: InvoiceStatsDto;

  @ApiProperty({ type: InvoiceStatsDto })
  paid: InvoiceStatsDto;

  @ApiProperty({ type: InvoiceStatsDto })
  draft: InvoiceStatsDto;

  @ApiProperty({ type: InvoiceStatsDto })
  overdue: InvoiceStatsDto;
}

export class InvoiceWithCustomerDto {
  @ApiProperty({ example: 'inv-123', description: 'Invoice ID' })
  id: string;

  @ApiProperty({
    example: 'INV-20250101-001',
    description: 'Invoice number',
  })
  invoiceNumber: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Customer name' })
  customerName: string;

  @ApiProperty({ example: 'Sent', description: 'Invoice status' })
  status: string;

  @ApiProperty({ example: 5000, description: 'Invoice total amount' })
  total: number;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Invoice date' })
  invoiceDate: string;

  @ApiProperty({ example: '2025-02-01T00:00:00Z' })
  dueDate: string;
}

export class GetEntityInvoicesResponseDto {
  @ApiProperty({
    type: [InvoiceWithCustomerDto],
    description: 'Paginated invoice list',
  })
  invoices: InvoiceWithCustomerDto[];

  @ApiProperty({
    type: InvoiceAggregatesDto,
    description: 'Stats by status (count and total amount)',
  })
  stats: InvoiceAggregatesDto;

  @ApiProperty({
    example: 50,
    description: 'Total invoices matching the filter',
  })
  totalCount: number;

  @ApiProperty({
    example: 5,
    description: 'Total pages',
  })
  totalPages: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;
}
