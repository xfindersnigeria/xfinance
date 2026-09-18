import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Invoices and bills can be raised for a customer/vendor that isn't saved as
 * a Customer/Vendor record — the name is typed in (customerName/vendorName),
 * the same way income receipts and expenses already work.
 *
 * The API presents a typed-in party in the same shape as a saved one
 * (`invoice.customer.name`, `bill.vendor.displayName`) so every screen, PDF and
 * email that reads the relation keeps working; `id` is null for them.
 */
export function withInvoiceParty<
  T extends { customer?: any; customerName?: string | null; customerEmail?: string | null },
>(invoice: T): T {
  if (!invoice || invoice.customer || !invoice.customerName) return invoice;
  return {
    ...invoice,
    customer: { id: null, name: invoice.customerName, email: invoice.customerEmail ?? null },
  };
}

export function withBillParty<T extends { vendor?: any; vendorName?: string | null }>(bill: T): T {
  if (!bill || bill.vendor || !bill.vendorName) return bill;
  return {
    ...bill,
    vendor: { id: null, name: bill.vendorName, displayName: bill.vendorName, email: null },
  };
}

/** Validate the customer on an invoice: a saved customer of this entity, or a typed-in name. */
export async function resolveInvoiceCustomer(
  prisma: PrismaService,
  entityId: string,
  input: { customerId?: string | null; customerName?: string | null; customerEmail?: string | null },
): Promise<{ customerId: string | null; customerName: string | null; customerEmail: string | null }> {
  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, entityId },
      select: { id: true },
    });
    if (!customer) throw new HttpException('Customer not found', HttpStatus.BAD_REQUEST);
    return { customerId: customer.id, customerName: null, customerEmail: null };
  }
  const name = input.customerName?.trim();
  if (!name) throw new HttpException('Select a customer or type a customer name', HttpStatus.BAD_REQUEST);
  return { customerId: null, customerName: name, customerEmail: input.customerEmail?.trim() || null };
}

/** Validate the vendor on a bill: a saved vendor of this entity, or a typed-in name. */
export async function resolveBillVendor(
  prisma: PrismaService,
  entityId: string,
  input: { vendorId?: string | null; vendorName?: string | null },
): Promise<{ vendorId: string | null; vendorName: string | null }> {
  if (input.vendorId) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: input.vendorId, entityId },
      select: { id: true },
    });
    if (!vendor) throw new HttpException('Vendor not found', HttpStatus.BAD_REQUEST);
    return { vendorId: vendor.id, vendorName: null };
  }
  const name = input.vendorName?.trim();
  if (!name) throw new HttpException('Select a vendor or type a vendor name', HttpStatus.BAD_REQUEST);
  return { vendorId: null, vendorName: name };
}
