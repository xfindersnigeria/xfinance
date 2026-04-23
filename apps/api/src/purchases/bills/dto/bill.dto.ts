import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsDate,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BillItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Office Supplies', description: 'Item name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1000, description: 'Rate per unit' })
  @IsNumber()
  rate: number;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'acc-expense-123', description: 'Expense account ID for this item' })
  @IsString()
  expenseAccountId: string;
}

export class CreateBillDto {
  @ApiProperty({ example: '2025-12-24T00:00:00Z', description: 'Bill date' })
  @IsDate()
  @Type(() => Date)
  billDate: Date;

  @ApiProperty({ example: 'vendor_uuid', description: 'Vendor ID' })
  @IsString()
  vendorId: string;

   @IsOptional()
  @IsString()
  projectId?: string = '';

   @IsOptional()
  @IsString()
  milestoneId?: string = '';

  @ApiProperty({ example: '2025-01-24T00:00:00Z', description: 'Due date' })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiPropertyOptional({
    example: 'PO-123',
    description: 'Purchase order number',
  })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiProperty({ example: 'Net 30', description: 'Payment terms' })
  @IsString()
  paymentTerms: string;

  @ApiProperty({ type: [BillItemDto], description: 'Bill items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  items: BillItemDto[];

  @ApiProperty({ example: 50000, description: 'Total amount' })
  @Type(() => Number)
  total: number;


  @ApiPropertyOptional({ example: 'Payment terms noted', description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
  @ApiPropertyOptional({ example: '10000', description: 'Discount' })
  @IsOptional()
  @IsString()
  discount?: string;
  @ApiPropertyOptional({ example: '10000', description: 'Tax' })
  @IsOptional()
  @IsString()
  tax?: string;

  @ApiPropertyOptional({
    example: 'draft',
    enum: ['draft', 'unpaid', 'partial', 'paid'],
    description: 'Bill status (default: draft)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'acc-payable-123', description: 'Accounts payable account ID for this bill' })
  @IsOptional()
  @IsString()
  accountsPayableId: string;


  @ApiProperty({ example: 'acc-payable-123', description: 'Accounts payable account ID for this bill' })
  @IsOptional()
  @IsString()
  subject: string;


}

export class UpdateBillDto {
  @ApiPropertyOptional({
    example: '2025-12-24T00:00:00Z',
    description: 'Bill date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  billDate?: Date;

  

  @ApiPropertyOptional({ example: 'vendor_uuid', description: 'Vendor ID' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    example: '2025-01-24T00:00:00Z',
    description: 'Due date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    example: 'PO-123',
    description: 'Purchase order number',
  })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional({ example: 'Net 30', description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ type: [BillItemDto], description: 'Bill items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  items?: BillItemDto[];

  @ApiPropertyOptional({
    example: ['item_1'],
    description: 'IDs of items to remove',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  removeItemIds?: string[];

  @ApiPropertyOptional({ example: 50000, description: 'Total amount' })
  @IsOptional()
  @Type(() => Number)
  total?: number;


  @ApiPropertyOptional({ example: 'Payment terms noted', description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '10000', description: 'Discount' })
  @IsOptional()
  @IsString()
  discount?: string;
  @ApiPropertyOptional({ example: '10000', description: 'Tax' })
  @IsOptional()
  @IsString()
  tax?: string;

  @ApiPropertyOptional({
    example: 'unpaid',
    enum: ['draft', 'unpaid', 'partial', 'paid'],
    description: 'Bill status',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class BillDto extends CreateBillDto {
  @ApiProperty({ example: 'bill_uuid', description: 'Bill ID' })
  id: string;

  @ApiPropertyOptional({
    example: { publicId: 'bill/file', secureUrl: 'https://...' },
  })
  attachment?: Record<string, any>;

  @ApiProperty({ example: '2025-12-24T00:00:00Z' })
  createdAt: string;

  @ApiPropertyOptional({
    example: 'Pending',
    enum: ['Pending', 'Processing', 'Success', 'Failed'],
    description: 'Journal posting status',
  })
  postingStatus?: string;

  @ApiPropertyOptional({
    example: 'BILL-JNL-20260228001',
    description: 'Reference to the journal entry',
  })
  journalReference?: string;

  @ApiPropertyOptional({
    example: '2026-02-28T10:30:00Z',
    description: 'Timestamp when successfully posted to journal',
  })
  postedAt?: string;
}
