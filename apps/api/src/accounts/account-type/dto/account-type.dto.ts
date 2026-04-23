import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAccountTypeDto {
  @ApiProperty({ example: '1000', description: 'Fixed account type code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Assets', description: 'Name of the account type' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'All asset accounts',
    description: 'Description of the account type',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateAccountTypeDto extends PartialType(CreateAccountTypeDto) {}

export class AccountTypeResponseDto {
  @ApiProperty({ example: 'type_123', description: 'Account type ID' })
  id: string;

  @ApiProperty({ example: '1000', description: 'Fixed account type code' })
  code: string;

  @ApiProperty({ example: 'Assets', description: 'Name of the account type' })
  name: string;

  @ApiProperty({
    example: 'All asset accounts',
    description: 'Description of the account type',
  })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
