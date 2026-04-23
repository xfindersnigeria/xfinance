import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  MONEY_MARKET = 'money_market',
  CREDIT_CARD = 'credit_card',
  BUSINESS = 'business',
}

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Main Operating Account' })
  @IsString()
  accountName: string;

  @ApiProperty({ example: 'Chase Bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ enum: BankAccountType, example: BankAccountType.CHECKING })
  @IsEnum(BankAccountType)
  accountType: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: '021000021', required: false })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  openingBalance: number;
}
