import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsDate,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'prisma/generated/enums';

export class CreateExpenseDto {
  @ApiProperty({ example: '2025-12-18T00:00:00Z', description: 'Expense date' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ example: 'Acme Supplies', description: 'Vendor name' })
  @IsString()
  vendorId: string;

  @ApiProperty({ example: 'Office Supplies', description: 'Expense account ID' })
  @IsString()
  expenseAccountId: string;

  @ApiProperty({
    example: PaymentMethod.Cash,
    enum: PaymentMethod,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: 'acc_abc123',
    description: 'Payment account ID)',
  })
  @IsOptional()
  @IsString()
  paymentAccountId?: string;

  @ApiProperty({
    example: 5000,
    description: 'Amount in smallest currency unit',
  })
  @IsNumber({}, { message: 'amount must be a valid number' })
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: '500', description: 'Tax amount' })
  @IsString()
  tax: string;

  @ApiPropertyOptional({
    example: 'Office supplies purchase',
    description: 'Description',
  })
  @IsOptional()
  @IsString()
  description?: string;

   @IsOptional()
  @IsString()
  projectId?: string = '';

   @IsOptional()
  @IsString()
  milestoneId?: string = '';

  @ApiPropertyOptional({
    example: 'draft',
    enum: ['draft', 'approved', 'rejected'],
    description: 'Expense status',
  })
  @IsOptional()
  @IsEnum(['draft', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ example: ['office', 'supplies'], description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: '2025-12-18T00:00:00Z', description: 'Expense date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @ApiPropertyOptional({ example: 'vendor_123', description: 'Vendor ID' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'Office Supplies', description: 'Expense category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: PaymentMethod.Cash,
    enum: PaymentMethod,
    description: 'Payment method',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'acc_abc123', description: 'Expense account ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Amount in smallest currency unit',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: '500', description: 'Tax amount' })
  @IsOptional()
  @IsString()
  tax?: string;

  @ApiPropertyOptional({
    example: 'Office supplies purchase',
    description: 'Description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'approved',
    enum: ['draft', 'approved', 'rejected'],
    description: 'Expense status',
  })
  @IsOptional()
  @IsEnum(['draft', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ example: ['office', 'supplies'], description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ExpenseDto extends CreateExpenseDto {
  @ApiProperty({ example: 'exp_cuid', description: 'Expense id' })
  id: string;

  @ApiPropertyOptional({
    example: { id: 'acc_abc123', name: 'Office Supplies', code: '5200' },
    description: 'Expense account details',
  })
//   expenseAccountId?: {
//     id: string;
//     name: string;
//     code: string;
//   };

//  @ApiPropertyOptional({
//     example: { id: 'acc_abc123', name: 'Office Supplies', code: '5200' },
//     description: 'Payment account details',
//   })
//  paymentAccountId?: {
//     id: string;
//     name: string;
//     code: string;
//   };
  @ApiPropertyOptional({
    example: { publicId: 'exp/file', secureUrl: 'https://...' },
    description: 'Attachment info',
  })
  attachment?: Record<string, any>;

  @ApiProperty({ example: '2025-12-18T00:00:00Z', description: 'Created at' })
  createdAt: string;
}
