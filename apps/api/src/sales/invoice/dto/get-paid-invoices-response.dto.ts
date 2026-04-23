import { ApiProperty } from '@nestjs/swagger';

export class PaidInvoiceDetailDto {
  @ApiProperty({ example: 'inv-123', description: 'Invoice ID' })
  id: string;

  @ApiProperty({
    example: 'INV-20250101-001',
    description: 'Invoice number',
  })
  invoiceNumber: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Customer name' })
  customerName: string;

  @ApiProperty({ example: 5000, description: 'Invoice amount' })
  total: number;

  @ApiProperty({ example: '2025-01-01T00:00:00Z' })
  invoiceDate: string;

  @ApiProperty({ example: '2025-02-01T00:00:00Z' })
  dueDate: string;
}

export class MonthlyTotalDto {
  @ApiProperty({ example: '2025-01', description: 'Year-Month (YYYY-MM)' })
  month: string;

  @ApiProperty({
    example: 50000,
    description: 'Total amount for this month',
  })
  total: number;

  @ApiProperty({
    example: 10,
    description: 'Count of paid invoices in this month',
  })
  count: number;
}

export class GetPaidInvoicesResponseDto {
  @ApiProperty({
    type: [PaidInvoiceDetailDto],
    description: 'Paginated list of paid invoices',
  })
  paidInvoices: PaidInvoiceDetailDto[];

  @ApiProperty({
    example: 100000,
    description: 'Total amount of all paid invoices',
  })
  totalPaidAmount: number;

  @ApiProperty({
    example: 50,
    description: 'Total count of paid invoices',
  })
  totalPaidCount: number;

  @ApiProperty({
    type: MonthlyTotalDto,
    description: 'Monthly breakdown of current month paid invoices',
  })
  currentMonthStats: MonthlyTotalDto;

  @ApiProperty({
    example: '2025-12',
    description: 'Current month in YYYY-MM format',
  })
  currentMonth: string;

  @ApiProperty({
    example: 50,
    description: 'Total paid invoices matching the filter',
  })
  totalCountFiltered: number;

  @ApiProperty({
    example: 5,
    description: 'Total pages for pagination',
  })
  totalPages: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;
}
