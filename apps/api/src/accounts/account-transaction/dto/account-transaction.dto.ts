import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { AccountTransactionType, TransactionPostingStatus } from 'prisma/generated/client';
import { Type } from 'class-transformer';

export class CreateAccountTransactionDto {
  @IsDateString()
  date: Date;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsEnum(AccountTransactionType)
  type: AccountTransactionType;

  @IsString()
  accountId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  debitAmount: number = 0;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditAmount: number = 0;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  runningBalance?: number;

  @IsOptional()
  @IsString()
  payee?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsString()
  groupId: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class GetAccountTransactionsFilterDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(AccountTransactionType)
  type?: AccountTransactionType;

  @IsOptional()
  @IsEnum(TransactionPostingStatus)
  status?: TransactionPostingStatus;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search in description, reference, or payee

  @IsOptional()
  @IsString()
  method?: string; // Filter by payment method

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;
}

export class AccountTransactionResponseDto {
  id: string;
  date: Date;
  description: string;
  reference?: string;
  type: AccountTransactionType;
  status: TransactionPostingStatus;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance?: number;
  payee?: string;
  method?: string;
  entityId: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  bankAccountId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
