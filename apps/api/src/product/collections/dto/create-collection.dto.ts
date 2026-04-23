import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Spring Sale', description: 'Collection name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'spring-sale',
    description: 'URL slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: {},
    description: 'Image metadata or will be uploaded',
  })
  @IsOptional()
  image?: Record<string, any>;

  @ApiProperty({ example: 'A collection of spring items', description: 'Collection description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether collection is visible on online store',
  })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether collection is featured',
  })
  @IsOptional()
  @IsString()
  featured?: string;

  @ApiPropertyOptional({
    example: "['item-id-1', 'item-id-2']",
    description: 'Array of item IDs to add to collection',
  })
  @IsOptional()
  @IsString()
  itemIds?: string;
}

export class UpdateCollectionDto {
  @ApiPropertyOptional({ example: 'Spring Sale', description: 'Collection name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'spring-sale',
    description: 'URL slug',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: {},
    description: 'Image metadata',
  })
  @IsOptional()
  image?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'A collection of spring items',
    description: 'Collection description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether collection is visible on online store',
  })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether collection is featured',
  })
  @IsOptional()
  @IsString()
  featured?: string;

  @ApiPropertyOptional({
    example: ['item-id-1', 'item-id-2'],
    description: 'Array of item IDs (replaces current items)',
  })
  @IsOptional()
  @IsString()
  itemIds?: string;
}

export class CollectionItemDto {
  @ApiProperty({ example: 'item-id' })
  id: string;

  @ApiProperty({ example: 'Product Name' })
  name: string;

  @ApiProperty({ example: 'product' })
  category: string;

  @ApiProperty({ example: 999 })
  sellingPrice?: number;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: '2025-12-24T00:00:00Z' })
  createdAt: string;
}

export class CollectionDto extends CreateCollectionDto {
  @ApiProperty({ example: 'collection-id' })
  id: string;

  @ApiProperty({
    type: [CollectionItemDto],
    description: 'Items in the collection',
  })
  items: CollectionItemDto[];

  @ApiProperty({ example: '2025-12-24T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-12-24T00:00:00Z' })
  updatedAt: string;
}

