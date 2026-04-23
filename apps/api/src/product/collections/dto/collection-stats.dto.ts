import { ApiProperty } from '@nestjs/swagger';

export class CollectionStatsDto {
  @ApiProperty({
    example: 12,
    description: 'Total number of collections',
  })
  totalCollections?: number;

  @ApiProperty({
    example: 4,
    description: 'Number of active (visible) collections',
  })
  activeCollections?: number;

  @ApiProperty({
    example: 156,
    description: 'Total number of items across all collections',
  })
  totalItems?: number;

  @ApiProperty({
    example: 245000,
    description: 'Total collection value',
  })
  totalValue?: Number;

  @ApiProperty({
    example: 'Best Sellers',
    description: 'Most popular collection name',
  })
  mostPopularCollection?: string;

  @ApiProperty({
    example: 24,
    description: 'Number of items in the most popular collection',
  })
  mostPopularItemCount?: number;
}

export class CollectionsWithStatsDto {
  @ApiProperty({
    type: CollectionStatsDto,
    description: 'Collection statistics',
  })
  stats?: CollectionStatsDto;

  @ApiProperty()
  collections?: any[];

  @ApiProperty()
  total?: number;

  @ApiProperty()
  currentPage?: number;

  @ApiProperty()
  pageSize?: number;

  @ApiProperty()
  totalPages?: number;
}
