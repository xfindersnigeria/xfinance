import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum JournalStatusEnum {
  DRAFT = 'Draft',
  ACTIVE = 'Active',
}

export class JournalLineDto {
  @ApiProperty({ example: 'acc_abc123', description: 'Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: 'Payment to landlord for March rent',
    description: 'Description for this journal line (per-line narrative)',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Debit amount (positive number)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  debit?: number = 0;

  @ApiPropertyOptional({
    example: 0,
    description: 'Credit amount (positive number)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number = 0;
}

export class CreateJournalDto {
  @ApiPropertyOptional({ example: 'Office rent payment - March 2025' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  date: string; // will be converted to DateTime

  @ApiPropertyOptional({
    enum: JournalStatusEnum,
    example: JournalStatusEnum.ACTIVE,
    description: 'Journal status - Draft (no posting) or Active (post immediately)',
  })
  @IsOptional()
  @IsEnum(JournalStatusEnum)
  status?: JournalStatusEnum = JournalStatusEnum.ACTIVE;

  @ApiProperty({
    type: [JournalLineDto],
    description:
      'Array of journal entry lines with per-line descriptions and amounts',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];

  @ApiProperty({ example: 'comp_abc123' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class UpdateJournalDto {
  @ApiPropertyOptional({ example: 'Payment for office rent - corrected' })
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2025-01-16' })
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    type: [JournalLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines?: JournalLineDto[];

  @ApiPropertyOptional({ example: 'INV-2025015-004' })
  @IsString()
  reference?: string;
}

