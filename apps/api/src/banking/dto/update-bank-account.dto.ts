import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum BankAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
}

export class UpdateBankAccountDto {
  @ApiProperty({ example: 'Main Operating Account', required: false })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ example: 'Chase Bank', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: 'checking', required: false })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: '021000021', required: false })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiProperty({ enum: BankAccountStatus, required: false })
  @IsOptional()
  @IsEnum(BankAccountStatus)
  status?: BankAccountStatus;
}
