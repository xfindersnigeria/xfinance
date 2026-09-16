import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAssetCategoryDto {
  @ApiProperty({ example: 'Motor vehicle' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 20, description: 'Straight-line annual depreciation rate, percent of cost' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  depreciationRate: number;

  @ApiPropertyOptional({ example: 'Cars, vans and trucks' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateAssetCategoryDto extends PartialType(CreateAssetCategoryDto) {}
