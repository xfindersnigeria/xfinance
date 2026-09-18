import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'prisma/generated/enums';

export class OrderLineDto {
  @IsString() @IsNotEmpty() storeItemId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) quantity: number;
}

/** POS / Quick Sale checkout — paid on the spot */
export class PosCheckoutDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  // A saved customer, a typed-in name, or neither (walk-in)
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  // Emails the receipt when Settings → Email "Receipt Emails" is on
  @IsOptional() @IsEmail() customerEmail?: string;

  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  // Cash/bank account the money goes into
  @IsString() @IsNotEmpty() depositTo: string;

  @IsOptional() @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsString() taxName?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

/** Mark a pending (online) order as paid — creates its receipt, posts it, takes the stock */
export class CompleteOrderDto {
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsString() @IsNotEmpty() depositTo: string;
}

export class CancelOrderDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class GetOrdersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['POS', 'ONLINE']) source?: 'POS' | 'ONLINE';
  @IsOptional() @IsIn(['Pending', 'Completed', 'Cancelled']) status?: 'Pending' | 'Completed' | 'Cancelled';
}

export class UpdateStoreSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Store link can only use lowercase letters, numbers and single dashes',
  })
  @MaxLength(60)
  slug?: string;
}

/** Customer checkout on the public online store — pays the business directly afterwards */
export class PublicOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  @IsString() @IsNotEmpty() @MaxLength(120) customerName: string;
  @IsEmail() customerEmail: string;
  @IsString() @IsNotEmpty() @MaxLength(40) customerPhone: string;
  @IsOptional() @IsString() @MaxLength(500) deliveryAddress?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
