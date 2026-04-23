import { ApiProperty } from '@nestjs/swagger';
import { CollectionDto } from './create-collection.dto';

export class GetCollectionsResponseDto {
  @ApiProperty({
    type: [CollectionDto],
    description: 'List of collections',
  })
  collections: CollectionDto[] = [];

  @ApiProperty({
    example: 25,
    description: 'Total number of collections matching the filter',
  })
  total: number = 0;

  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number = 1;

  @ApiProperty({ example: 10, description: 'Items per page' })
  pageSize: number = 10;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number  = 0;
}
