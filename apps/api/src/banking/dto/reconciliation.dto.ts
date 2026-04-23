import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StatementTransactionInputDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}

export class ReconciliationMatchInputDto {
  @ApiProperty() @IsString() statementTransactionId: string;
  @ApiProperty() @IsString() bookTransactionId: string;
}

export class SaveReconciliationDraftDto {
  @ApiProperty() @IsDateString() statementEndDate: string;
  @ApiProperty() @IsNumber() statementEndingBalance: number;

  @ApiProperty({ type: [StatementTransactionInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatementTransactionInputDto)
  statementTransactions: StatementTransactionInputDto[];

  @ApiProperty({ type: [ReconciliationMatchInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationMatchInputDto)
  matches: ReconciliationMatchInputDto[];
}

export class CompleteReconciliationDto extends SaveReconciliationDraftDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
