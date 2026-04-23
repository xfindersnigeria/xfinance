import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'prisma/generated/enums';

export class CreatePaymentDto {
  @ApiProperty({ example: '2025-12-24T00:00:00Z', description: 'Payment date' })
  @Type(() => Date)
  paidAt: Date;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'REF-12345', description: 'Payment reference' })
  @IsString()
  reference: string;

  @ApiProperty({ example: 'Bank Account #', description: 'Account used' })
  @IsString()
  account: string;

  @ApiProperty({ example: 5000, description: 'Amount paid' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    example: 'Partial payment',
    description: 'Optional note',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class PaymentDto extends CreatePaymentDto {
  @ApiProperty({ example: 'payment_uuid' })
  id: string;

  @ApiProperty({ example: '2025-12-24T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: 'vendor name', description: 'Vendor display name' })
  vendorName?: string;
}
