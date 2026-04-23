import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Entity display name' })
  @IsString()
  name: string = '';

  @ApiProperty({
    example: 'Acme Corporation Ltd',
    description: 'Legal name of the entity',
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiProperty({ example: '12-3456789', description: 'Tax ID or VAT number' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({
    example: 'United States',
    description: 'Country of operation',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    example: 'USD',
    description: 'Default currency code (e.g., USD, EUR, GBP)',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    example: '12-31',
    description: 'Year-end date in MM-DD format',
  })
  @IsString()
  @IsOptional()
  yearEnd?: string;

  @ApiProperty({ example: '123 Business Ave', description: 'Street address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'NY', description: 'State or province' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '10001', description: 'Postal code or ZIP code' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: '+1-555-0123', description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    example: 'contact@acmecorp.com',
    description: 'Contact email address',
  })
  @IsEmail()
  @IsString()
  email: string = '';

  @ApiPropertyOptional({
    example: 'https://www.acmecorp.com',
    description: 'Company website URL',
  })
  @IsUrl()
  @IsOptional()
  website?: string;
}
