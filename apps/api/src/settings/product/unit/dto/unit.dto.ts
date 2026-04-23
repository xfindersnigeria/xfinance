import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ProductStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateProductUnitDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() abbreviation: string;
  @IsNotEmpty() @IsString() type: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export class UpdateProductUnitDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() abbreviation?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
