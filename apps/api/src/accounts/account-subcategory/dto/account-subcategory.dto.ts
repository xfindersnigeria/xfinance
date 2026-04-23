import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAccountSubCategoryDto {
  @ApiProperty({
    example: 'Cash in Bank',
    description: 'Name of the account subcategory',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'cat_123',
    description: 'Account category ID this subcategory belongs to',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    example: 'Daily bank deposits',
    description: 'Description of the subcategory',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '1110',
    description: 'Optional code - if not provided, auto-generated',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;
}

export class UpdateAccountSubCategoryDto extends PartialType(
  CreateAccountSubCategoryDto,
) {}

export class AccountSubCategoryResponseDto {
  @ApiProperty({ example: 'subcat_123', description: 'SubCategory ID' })
  id: string;

  @ApiProperty({ example: '1110', description: 'SubCategory code' })
  code: string;

  @ApiProperty({
    example: 'Cash in Bank',
    description: 'Name of the account subcategory',
  })
  name: string;

  @ApiProperty({ example: 'cat_123', description: 'Category ID' })
  categoryId: string;

  @ApiProperty({
    example: 'Daily bank deposits',
    description: 'Description of the subcategory',
  })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
