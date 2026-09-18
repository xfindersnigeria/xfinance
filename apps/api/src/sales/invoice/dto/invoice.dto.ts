import {
  IsString,
  IsDate,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEmail,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from 'prisma/generated/enums';

// Invoice Item DTO (shared between Create and Update)
export class InvoiceItemDto {
  @IsOptional()
  @IsString()
  id?: string = ''; // If provided, it's an update; if missing, it's a new item

  @IsString()
  itemId: string = '';

  @IsNumber()
  rate: number = 0;

  @IsNumber()
  quantity: number = 0;
}

// Create Invoice DTO (for creating a new invoice)
export class CreateInvoiceDto {
  // A saved customer, or a typed-in customerName (one of the two is required)
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  // Where to email a typed-in customer's invoice (saved customers use their record)
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsDate()
  @Type(() => Date)
  invoiceDate: Date = new Date(); // Default to current date

  @IsDate()
  @Type(() => Date)
  dueDate: Date = new Date(new Date().setDate(new Date().getDate() + 30)); // Default to 30 days from now

  @IsString()
  paymentTerms: string = 'Net 30'; // Default payment terms

  @IsString()
  currency: string = ''; // Default currency

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  @IsInt()
  total?: number = 0;

  @IsOptional()
  @IsString()
  notes?: string = '';

  @IsOptional()
  @IsString()
  projectId?: string = '';

   @IsOptional()
  @IsString()
  mielstoneId?: string = '';

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus = InvoiceStatus.Draft; // Default to Draft

  // % applied to taxable lines; falls back to the entity's default sales tax rate
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  // Tax rate / group / exemption the rate was picked from (Settings → Tax)
  @IsOptional()
  @IsString()
  taxName?: string;
}

// Update Invoice DTO (for partial updates with item management)
export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  invoiceDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsString()
  paymentTerms?: string = '';

  @IsOptional()
  @IsString()
  currency?: string = '';

   @IsOptional()
  @IsString()
  projectId?: string = '';

   @IsOptional()
  @IsString()
  mielstoneId?: string = '';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  // % applied to taxable lines; falls back to the entity's default sales tax rate
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeItemIds?: string[]; // IDs of invoice items to remove

  @IsOptional()
  @IsInt()
  total?: number = 0;

  @IsOptional()
  @IsString()
  notes?: string = '';

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

// Response DTO (for returning invoice data, includes id)
export class InvoiceDto extends CreateInvoiceDto {
  @IsString()
  id: string = '';

  @IsDate()
  @Type(() => Date)
  createdAt: Date = new Date();

  @IsDate()
  @Type(() => Date)
  updatedAt: Date = new Date();
}

// Update Invoice Status DTO
export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}
