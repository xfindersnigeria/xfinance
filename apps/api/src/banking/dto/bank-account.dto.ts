import { ApiProperty } from '@nestjs/swagger';

export class BankAccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  accountType: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty({ nullable: true })
  routingNumber: string | null;

  @ApiProperty()
  openingBalance: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  linkedAccountId: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BankTransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true })
  category: string | null;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  type: string;

  @ApiProperty({ nullable: true })
  reference: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  metadata: any | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
