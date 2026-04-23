import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Acme Industries', description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Acme Industries Inc.', description: 'Legal name' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ example: '12-3456789', description: 'Tax ID' })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({ example: 'Manufacturing', description: 'Industry' })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty({ example: '123 Business Ave', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Lagos', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Lagos State', description: 'Province/State' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '100001', description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'contact@acme.com', description: 'Email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    example: 'https://acme.com',
    description: 'Website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: 'sub_123abc',
    description: 'Subscription ID',
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;
}
