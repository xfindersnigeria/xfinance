import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStoreSupplyDto {
  name: string;
  category: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  minQuantity: number;
  location?: string;
  supplier?: string;
}

export class UpdateStoreSupplyDto {
  name?: string;
  category?: string;
  sku?: string;
  description?: string;
  unitPrice?: number;
  quantity?: number;
  minQuantity?: number;
  location?: string;
  supplier?: string;
}

export class GetStoreSuppliesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Office Supplies',
    description: 'Search by name, category, SKU, description, supplier, or location',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateSupplyIssueDto {
  @IsString()
  supplyId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  issuedTo: string;

  @IsString()
  type: 'employee' | 'department' | 'project';

  @IsString()
  purpose: string;

  @IsString()
  issuedBy: string;

  @IsOptional()
  @IsString()
  notes?: string;

  issueDate: Date;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class BulkCreateSupplyIssueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplyIssueDto)
  selectedItems: CreateSupplyIssueDto[];
}


