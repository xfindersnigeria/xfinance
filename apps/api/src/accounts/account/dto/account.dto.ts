import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Cash on Hand', description: 'Name of the account' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'subcat_123',
    description: 'SubCategory ID the account belongs to',
  })
  @IsString()
  @IsNotEmpty()
  subCategoryId: string;

  @ApiProperty({
    example: 'Main cash account for daily transactions',
    description: 'Description of the account',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: '1110',
    description: 'Optional account code - if not provided, auto-generated',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    example: 1500,
    description: 'Current balance of the account',
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  balance?: number;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}

export class AccountResponseDto {
  @ApiProperty({
    example: 'acc_abc123',
    description: 'Unique identifier for the account',
  })
  id: string;

  @ApiProperty({ example: 'Cash on Hand', description: 'Name of the account' })
  name: string;

  @ApiProperty({ example: '1110', description: 'Account code or ID' })
  code: string;

  @ApiProperty({
    example: 'Main cash account for daily transactions',
    description: 'Description of the account',
  })
  description: string;

  @ApiProperty({ example: 'subcat_123', description: 'SubCategory ID' })
  subCategoryId: string;

  @ApiProperty({ example: 1500, description: 'Current balance of the account' })
  balance: number;

  @ApiProperty({ example: 'Assets', description: 'Account type name' })
  typeName?: string;

  @ApiProperty({ example: 'Current Assets', description: 'Category name' })
  categoryName?: string;

  @ApiProperty({ example: 'Bank Accounts', description: 'SubCategory name' })
  subCategoryName?: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OpeningBalanceLineDto {
  @ApiProperty({
    example: 'acc_abc123',
    description: 'Account ID',
  })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: 1000,
    description: 'Debit amount',
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  debit?: number;

  @ApiProperty({
    example: 500,
    description: 'Credit amount',
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  credit?: number;
}

export class OpeningBalanceDto {
  @ApiProperty({
    type: [OpeningBalanceLineDto],
    description: 'Array of opening balance lines',
  })
  @IsNotEmpty()
  lines: OpeningBalanceLineDto[];
}
