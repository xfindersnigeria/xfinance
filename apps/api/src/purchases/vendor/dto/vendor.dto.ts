import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'Acme Supplies', description: 'Vendor name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'supplier', description: 'Vendor type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'Acme', description: 'Display name' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ example: '12-3456789', description: 'Tax ID' })
  @IsString()
  taxId: string;

  @ApiPropertyOptional({
    example: 'https://acme.example.com',
    description: 'Website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: 'Acme Corporation',
    description: 'Company name',
  })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({
    example: 'Purchasing Manager',
    description: 'Job title',
  })
  @IsString()
  jobTitle: string;

  @ApiPropertyOptional({
    example: 'vendor@example.com',
    description: 'Contact email',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Contact phone' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'Lagos', description: 'City' })
  @IsString()
  city: string;

  @ApiPropertyOptional({
    example: 'Lagos State',
    description: 'Province/State',
  })
  @IsString()
  province: string;

  @ApiPropertyOptional({ example: '100001', description: 'Postal code' })
  @IsString()
  postalCode: string;

  @ApiPropertyOptional({ example: 'Nigeria', description: 'Country' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ example: 'Net 30', description: 'Payment terms' })
  @IsString()
  paymentTerms: string;

  @ApiPropertyOptional({ example: 'NGN', description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ example: '1234567890', description: 'Account number' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ example: '10000', description: 'Credit limit' })
  @IsString()
  creditLimit: string;

  @ApiPropertyOptional({
    example: 'acc_abc123',
    description: 'Expense account ID for this vendor',
  })
  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  @ApiPropertyOptional({ example: 'First Bank', description: 'Bank name' })
  @IsString()
  bankName: string;

  @ApiPropertyOptional({ example: 'Acme Account', description: 'Account name' })
  @IsString()
  accountName: string;

  @ApiPropertyOptional({ example: '111000025', description: 'Routing number' })
  @IsString()
  routingNumber: string;

  @ApiPropertyOptional({
    example: 'Internal notes...',
    description: 'Internal note',
  })
  @IsOptional()
  @IsString()
  internalNote?: string;
}

export class VendorDto extends CreateVendorDto {
  @ApiProperty({ example: 'vendor_cuid', description: 'Vendor id' })
  id: string;

  @ApiProperty({ example: '2025-12-18T00:00:00Z', description: 'Created at' })
  createdAt: string;

  @ApiPropertyOptional({
    example: { id: 'acc_abc123', name: 'Supplies Expense', code: '5200' },
    description: 'Expense account details',
  })
  expenseAccount?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    example: 5,
    description: 'Total number of bills from this vendor',
  })
  billsCount?: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Total outstanding amount for unpaid/partial bills (in smallest currency unit)',
  })
  outstandingAmount?: number;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Acme Supplies', description: 'Vendor name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'supplier', description: 'Vendor type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'Acme', description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: '12-3456789', description: 'Tax ID' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({
    example: 'https://acme.example.com',
    description: 'Website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: 'Acme Corporation',
    description: 'Company name',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'Purchasing Manager',
    description: 'Job title',
  })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({
    example: 'vendor@example.com',
    description: 'Contact email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Contact phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Lagos', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Lagos State',
    description: 'Province/State',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: '100001', description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Nigeria', description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Net 30', description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'NGN', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '1234567890', description: 'Account number' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: '10000', description: 'Credit limit' })
  @IsOptional()
  @IsString()
  creditLimit?: string;

  @ApiPropertyOptional({
    example: 'acc_abc123',
    description: 'Expense account ID for this vendor',
  })
  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  @ApiPropertyOptional({ example: 'First Bank', description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'Acme Account', description: 'Account name' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ example: '111000025', description: 'Routing number' })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiPropertyOptional({
    example: 'Internal notes...',
    description: 'Internal note',
  })
  @IsOptional()
  @IsString()
  internalNote?: string;

  @ApiPropertyOptional({ example: 'Active', description: 'Vendor status' })
  @IsOptional()
  @IsString()
  status?: string;
}
