import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ProductStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateProductBrandDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export class UpdateProductBrandDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
