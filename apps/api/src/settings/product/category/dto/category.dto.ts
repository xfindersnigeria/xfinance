import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ProductStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateProductCategoryDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export class UpdateProductCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
