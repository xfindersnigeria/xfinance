import { IsString, IsDate, IsArray, IsOptional, IsInt, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateOpeningBalanceItemDto {
  @IsString()
  accountId!: string;

  @IsInt()
  debit: number = 0;

  @IsInt()
  credit: number = 0;
}

export class CreateOpeningBalanceDto {
  @IsDate()
  @Type(() => Date)
  date!: Date;

  @IsString()
  @IsOptional()
  fiscalYear?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOpeningBalanceItemDto)
  items!: CreateOpeningBalanceItemDto[];
}

export class UpdateOpeningBalanceDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @IsOptional()
  fiscalYear?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOpeningBalanceItemDto)
  @IsOptional()
  items?: CreateOpeningBalanceItemDto[];
}

export class OpeningBalanceDto {
  id!: string;
  entityId!: string;
  date!: Date;
  fiscalYear?: string;
  totalCredit!: number;
  totalDebit!: number;
  difference!: number;
  status!: string;
  note?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class OpeningBalanceItemDto {
  id!: string;
  openingBalanceId!: string;
  accountId!: string;
  debit!: number;
  credit!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class GetOpeningBalanceResponseDto extends OpeningBalanceDto {
  items!: OpeningBalanceItemDto[];
}
export class GetOpeningBalancesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'INV-20250101',
    description: 'Search by opening balance id, date, or note',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class GetOpeningBalancesResponseDto {
  @ApiProperty({
    type: [GetOpeningBalanceResponseDto],
    description: 'Paginated opening balance list',
  })
  data!: GetOpeningBalanceResponseDto[];

  @ApiProperty({
    example: 50,
    description: 'Total opening balances matching the filter',
  })
  totalCount!: number;

  @ApiProperty({
    example: 5,
    description: 'Total pages',
  })
  totalPages!: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  currentPage!: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit!: number;
}