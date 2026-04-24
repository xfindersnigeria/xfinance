import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateEntityConfigDto {
  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsBoolean()
  multiCurrency?: boolean;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  numberFormat?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  twoFactorAuth?: boolean;

  @IsOptional()
  @IsBoolean()
  auditLog?: boolean;
}
