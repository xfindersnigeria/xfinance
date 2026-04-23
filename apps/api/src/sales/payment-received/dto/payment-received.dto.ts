import { IsString, IsInt, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'prisma/generated/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentReceivedDto {
  @ApiProperty({ example: 'inv_abc123', description: 'Invoice ID' })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in smallest currency unit',
  })
  @IsInt()
  amount: number;

  @ApiProperty({ example: '2026-02-10T00:00:00Z', description: 'Payment date' })
  @IsDate()
  @Type(() => Date)
  paidAt: Date;

  @ApiProperty({
    example: PaymentMethod.Bank_Transfer,
    enum: PaymentMethod,
    description: 'Payment method',
  })
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    example: 'acc_abc123',
    description: 'Account ID to deposit payment to',
  })
  @IsString()
  depositTo: string;

  @ApiProperty({ example: 'TRF-2026-001', description: 'Reference number' })
  @IsString()
  reference: string;

  @ApiPropertyOptional({
    example: 'Payment received for invoice',
    description: 'Payment note',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'proj_abc123', description: 'Project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'ms_abc123', description: 'Milestone ID' })
  @IsOptional()
  @IsString()
  milestoneId?: string;
}

export class UpdatePaymentReceivedDto {
  @ApiPropertyOptional({ example: 5000, description: 'Payment amount' })
  @IsOptional()
  @IsInt()
  amount?: number;

  @ApiPropertyOptional({
    example: '2026-02-10T00:00:00Z',
    description: 'Payment date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paidAt?: Date;

  @ApiPropertyOptional({
    example: PaymentMethod.Cash,
    enum: PaymentMethod,
    description: 'Payment method',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: 'acc_abc123',
    description: 'Account ID to deposit payment to',
  })
  @IsOptional()
  @IsString()
  depositTo?: string;

  @ApiPropertyOptional({
    example: 'CSH-2026-001',
    description: 'Reference number',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Updated note', description: 'Payment note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'proj_abc123', description: 'Project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'ms_abc123', description: 'Milestone ID' })
  @IsOptional()
  @IsString()
  milestoneId?: string;
}

export class PaymentReceivedResponseDto extends CreatePaymentReceivedDto {
  @ApiProperty({ example: 'pr_abc123', description: 'Payment record ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 5000, description: 'Invoice total amount' })
  @IsInt()
  total: number;

  @ApiProperty({ example: 'ent_abc123', description: 'Entity ID' })
  @IsString()
  entityId: string;

  @ApiProperty({
    example: '2026-02-10T00:00:00Z',
    description: 'Created at timestamp',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;
}
