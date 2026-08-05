import {
  IsString,
  IsDate,
  IsArray,
  IsInt,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, ReceiptStatus } from 'prisma/generated/enums';

export class ReceiptItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'item_123', description: 'Item ID (omit for a free-text line item)' })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({
    example: 'Consulting (custom)',
    description: 'Free-text item name, used when not mapped to an Items record',
  })
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiProperty({ example: 1000, description: 'Rate per unit' })
  @IsNumber()
  rate: number;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsNumber()
  quantity: number;
}

export class CreateReceiptDto {
  @ApiPropertyOptional({ example: 'cust_123', description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'Jane Doe (walk-in)',
    description: 'Free-text customer name, used when not mapped to a Customer record',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: '2025-12-18T00:00:00Z', description: 'Receipt date' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({
    example: PaymentMethod.Cash,
    enum: PaymentMethod,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ 
    example: 'acct_123', 
    description: 'Account ID where cash is deposited (Cash/Bank account 1010/1000)' 
  })
  @IsString()
  depositTo: string;

  @ApiProperty({ type: [ReceiptItemDto], description: 'List of items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];

  @ApiProperty({
    example: 5000,
    description: 'Total amount in smallest currency unit',
  })
  @IsInt()
  total: number;

   @ApiPropertyOptional({
    example: ReceiptStatus.Completed,
    enum: ReceiptStatus,
    description: 'Receipt status',
  })
  @IsOptional()
  @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;
}

export class UpdateReceiptDto {
  @ApiPropertyOptional({ example: 'cust_123', description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'Jane Doe (walk-in)',
    description: 'Free-text customer name, used when not mapped to a Customer record',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: '2025-12-18T00:00:00Z',
    description: 'Receipt date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @ApiPropertyOptional({
    example: PaymentMethod.Cash,
    enum: PaymentMethod,
    description: 'Payment method',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ 
    example: 'acct_123', 
    description: 'Account ID where cash is deposited (Cash/Bank account 1010/1000)' 
  })
  @IsOptional()
  @IsString()
  depositTo?: string;

  @ApiPropertyOptional({ type: [ReceiptItemDto], description: 'List of items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items?: ReceiptItemDto[];

  @ApiPropertyOptional({
    example: ['item_1'],
    description: 'IDs of items to remove',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeItemIds?: string[];

  @ApiPropertyOptional({
    example: 5000,
    description: 'Total amount in smallest currency unit',
  })
  @IsOptional()
  @IsInt()
  total?: number;

  @ApiPropertyOptional({
    example: ReceiptStatus.Completed,
    enum: ReceiptStatus,
    description: 'Receipt status',
  })
  @IsOptional()
  @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;
}

export class BulkIncomeItemDto {
  @ApiProperty({ example: '2025-11-24', description: 'Transaction date (ISO string)' })
  @IsString()
  date: string;

  @ApiProperty({ example: 'Consulting fee', description: 'Description / memo' })
  @IsString()
  description: string;

  @ApiProperty({ example: 85000, description: 'Amount in smallest currency unit (integer)' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: 'INV-2025-014', description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Customer / payer name (freetext)' })
  @IsOptional()
  @IsString()
  customerName?: string;
}

export class BulkImportReceiptsDto {
  @ApiProperty({ description: 'Cash/bank GL account to deposit into', example: 'acc_xyz' })
  @IsString()
  depositTo: string;

  @ApiProperty({ type: [BulkIncomeItemDto] })
  @IsArray()
  items: BulkIncomeItemDto[];
}

export class ReceiptDto extends CreateReceiptDto {
  @ApiProperty({ example: 'rec_abc123', description: 'Receipt id' })
  @IsString()
  id: string;

  @ApiProperty({
    example: '2025-12-18T00:00:00Z',
    description: 'Created at timestamp',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;
}
