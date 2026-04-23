import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateCustomizationDto {
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor must be a valid hex color (e.g. #4152B6)' })
  primaryColor?: string;
}

export class CustomizationResponseDto {
  primaryColor: string;
  logoUrl: string | null;
  loginBgUrl: string | null;
}

export const DEFAULT_CUSTOMIZATION: CustomizationResponseDto = {
  primaryColor: '#4152B6',
  logoUrl: null,
  loginBgUrl: null,
};
