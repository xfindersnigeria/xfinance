import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { systemRole } from 'prisma/generated/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  firstname: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  lastname: string;

  @ApiPropertyOptional({ example: 'Middle', description: 'Other name' })
  @IsString()
  @IsOptional()
  othername?: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'male', enum: ['male', 'female'] })
  @IsEnum(['male', 'female'] as const)
  @IsOptional()
  gender?: 'male' | 'female';

  @ApiProperty({ example: 'strongPassword', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: systemRole, description: 'User role' })
  @IsEnum(systemRole)
  role: systemRole;
}
