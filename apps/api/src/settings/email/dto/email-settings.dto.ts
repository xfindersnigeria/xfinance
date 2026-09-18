import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSmtpDto {
  @IsString() @IsNotEmpty() host: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(65535) port: number;
  @IsIn(['none', 'tls', 'ssl']) encryption: string;
  @IsString() @IsNotEmpty() username: string;
  // Leave empty to keep the saved password
  @IsOptional() @IsString() password?: string;
  @IsEmail() fromEmail: string;
  @IsOptional() @IsString() @MaxLength(120) fromName?: string;
}

export class TestSmtpDto {
  @IsEmail() to: string;
  // Unsaved form values to test; omitted fields fall back to the saved config
  @IsOptional() @IsString() host?: string;
  @IsOptional() @Type(() => Number) @IsInt() port?: number;
  @IsOptional() @IsIn(['none', 'tls', 'ssl']) encryption?: string;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsEmail() fromEmail?: string;
  @IsOptional() @IsString() fromName?: string;
}

export class UpdateEmailAutomationDto {
  @IsOptional() @IsBoolean() invoiceEmails?: boolean;
  @IsOptional() @IsBoolean() paymentReminders?: boolean;
  @IsOptional() @IsBoolean() paymentConfirmation?: boolean;
  @IsOptional() @IsBoolean() receiptEmails?: boolean;
  @IsOptional() @IsBoolean() monthlyStatements?: boolean;
  // Days before the due date, e.g. "3,7,14"
  @IsOptional() @IsString() @Matches(/^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/, {
    message: 'reminderSchedule must be comma-separated days, e.g. 3,7,14',
  })
  reminderSchedule?: string;
}

export class UpdateSignatureDto {
  @IsString() @MaxLength(2000) signature: string;
}

export class SaveEmailTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(300) subject: string;
  @IsString() @IsNotEmpty() @MaxLength(10000) body: string;
}
