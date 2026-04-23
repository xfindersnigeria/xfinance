import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  IsObject,
  IsEmail,
  Min,
  IsJSON,
} from 'class-validator';

class AddressInfoDto {
  @ApiProperty({ example: '123 Main St', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NY', description: 'Province or state' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '10001', description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'USA', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

class EmergencyContactDto {
  @ApiProperty({ example: 'John Doe', description: 'Contact name' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: '+1234567890', description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiProperty({ example: 'Spouse', description: 'Relationship to employee' })
  @IsString()
  @IsNotEmpty()
  relationship: string;
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '1990-01-01', description: 'Date of birth' })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;


  @ApiProperty({ example: 'Engineering', description: 'Department' })
  @IsString()
  @IsOptional()
  departmentId: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Position' })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiProperty({ example: 'Full-time', description: 'Employment type' })
  @IsString()
  @IsNotEmpty()
  employmentType: string;

  @ApiProperty({ example: '2023-01-01', description: 'Date of hire' })
  @IsDateString()
  @IsNotEmpty()
  dateOfHire: string;

  @ApiProperty({ example: 'Manager Name', description: 'Reporting manager' })
  @IsString()
  @IsNotEmpty()
  reportingManager: string;

  @ApiProperty({ example: 25, description: 'Annual leave days' })
  @IsString()
  anualLeave: number;

  @ApiProperty({ example: 50000, description: 'Salary amount' })
  @IsString()
  salary: number;

  @ApiProperty({ example: 5000, description: 'Allowances' })
  @IsString()
  allowances: number;

  @ApiProperty({ example: 'Monthly', description: 'Pay frequency' })
  @IsString()
  @IsNotEmpty()
  perFrequency: string;

  @ApiProperty({ example: 'USD', description: 'Currency' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'Bank of America', description: 'Bank name' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: 'Checking', description: 'Account type' })
  @IsString()
  @IsNotEmpty()
  acountType: string;

  @ApiProperty({ example: '123456789', description: 'Account number' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: '021000021', description: 'Routing number' })
  @IsString()
  @IsNotEmpty()
  routingNumber: string;

  @ApiProperty({ type: AddressInfoDto, description: 'Address information' })
  @IsJSON()
  @IsOptional()
  addressInfo?: AddressInfoDto;

  @ApiProperty({
    type: EmergencyContactDto,
    description: 'Emergency contact information',
  })
  @IsJSON()
  @IsOptional()
  emergencyContact?: EmergencyContactDto;

  @ApiProperty({ example: 'Additional notes', description: 'Notes' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class EmployeeResponseDto {
  @ApiProperty({ example: 'emp_abc123', description: 'Unique identifier' })
  id: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Date of birth' })
  dateOfBirth: Date;

  @ApiProperty({ example: 'Engineering', description: 'Department' })
  departmentId: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Position' })
  position: string;

  @ApiProperty({ description: 'Profile image' })
  profileImage?: any;

  @ApiProperty({ example: 'Full-time', description: 'Employment type' })
  employmentType: string;

  @ApiProperty({ description: 'Date of hire' })
  dateOfHire: Date;

  @ApiProperty({ example: 'Manager Name', description: 'Reporting manager' })
  reportingManager: string;

  @ApiProperty({ example: '25', description: 'Annual leave days' })
  anualLeave: string;

  @ApiProperty({ example: '50000', description: 'Salary amount' })
  salary: string;

  @ApiProperty({ example: '5000', description: 'Allowances' })
  allowances: string;

  @ApiProperty({ example: 'Monthly', description: 'Pay frequency' })
  perFrequency: string;

  @ApiProperty({ example: 'USD', description: 'Currency' })
  currency: string;

  @ApiProperty({ example: 'Bank of America', description: 'Bank name' })
  bankName: string;

  @ApiProperty({ example: 'Checking', description: 'Account type' })
  acountType: string;

  @ApiProperty({ example: '123456789', description: 'Account number' })
  accountNumber: string;

  @ApiProperty({ example: '021000021', description: 'Routing number' })
  routingNumber: string;

  @ApiProperty({ description: 'Address information' })
  addressInfo?: any;

  @ApiProperty({ description: 'Emergency contact information' })
  emergencyContact?: any;

  @ApiProperty({ example: 'Additional notes', description: 'Notes' })
  note?: string;

  @ApiProperty({ example: 'ent_abc123', description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class EmployeeStatsDto {
  @ApiProperty({ example: 50, description: 'Total number of employees' })
  totalEmployees: number;

  @ApiProperty({ example: 45, description: 'Number of active employees' })
  totalActive: number;

  @ApiProperty({ example: 3, description: 'Number of employees on leave' })
  totalOnLeave: number;

  @ApiProperty({
    example: 5,
    description: 'Number of employees hired this month',
  })
  totalHiredThisMonth: number;
}
