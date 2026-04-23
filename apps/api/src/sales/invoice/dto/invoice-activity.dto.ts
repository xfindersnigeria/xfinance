import { InvoiceActivityType } from 'prisma/generated/enums';

export class InvoiceActivityDto {
  id: string;
  invoiceId: string;
  activityType: InvoiceActivityType;
  description: string;
  performedBy?: string;
  metadata?: any;
  createdAt: Date;
}

export class CreateInvoiceActivityDto {
  activityType: InvoiceActivityType;
  description: string;
  performedBy?: string;
  metadata?: any;
}
