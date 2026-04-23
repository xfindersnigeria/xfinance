import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAccountCategoryDto {
  @ApiProperty({
    example: 'Current Assets',
    description: 'Name of the account category',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'type_123',
    description: 'Account type ID this category belongs to',
  })
  @IsString()
  @IsNotEmpty()
  typeId: string;

  @ApiProperty({
    example: 'Cash and bank accounts',
    description: 'Description of the category',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '1100',
    description: 'Optional code - if not provided, auto-generated',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;
}

export class UpdateAccountCategoryDto extends PartialType(
  CreateAccountCategoryDto,
) {}

export class AccountCategoryResponseDto {
  @ApiProperty({ example: 'cat_123', description: 'Category ID' })
  id: string;

  @ApiProperty({ example: '1100', description: 'Category code' })
  code: string;

  @ApiProperty({
    example: 'Current Assets',
    description: 'Name of the account category',
  })
  name: string;

  @ApiProperty({ example: 'type_123', description: 'Account type ID' })
  typeId: string;

  @ApiProperty({
    example: 'Cash and bank accounts',
    description: 'Description of the category',
  })
  description?: string;

  @ApiProperty({ example: 'group_123', description: 'Group ID' })
  groupId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
