import { ApiProperty } from '@nestjs/swagger';
import { VendorDto } from './vendor.dto';

export class GetVendorsResponseDto {
  @ApiProperty({ type: [VendorDto] })
  vendors: VendorDto[];

  @ApiProperty({ example: 100, description: 'Total vendors matching filter' })
  totalCount: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
