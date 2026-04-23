import { PrismaService } from '@/prisma/prisma.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(body: CreateCustomerDto, entityId: string, groupId: string) {
    try {
      const customerExist = await this.prisma.customer.findUnique({
        where: { email: body.email },
      });
      if (customerExist)
        throw new UnauthorizedException('Customer already exist!');

      return await this.prisma.customer.create({
        data: {
          ...body,
          entityId,
          groupId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async getAllCustomer(entityId: string) {
    try {
      // Fetch customers with full invoice and payment data
      const customersRaw = await this.prisma.customer.findMany({
        where: { entityId },
        include: {
          invoice: {
            include: {
              paymentReceived: true,
            },
          },
        },
      });

      // Calculate metrics for each customer
      const customersWithMetrics = customersRaw.map((c) => {
        // Calculate outstanding balance: sum of (invoice.total - payments received) for all invoices
        const outstandingBalance = c.invoice.reduce((total, invoice) => {
          const paidAmount = invoice.paymentReceived.reduce((sum, payment) => sum + payment.amount, 0);
          return total + (invoice.total - paidAmount);
        }, 0);

        // Return customer without full invoice/payment data
        const { invoice, ...customerData } = c;
        return {
          ...customerData,
          outstandingBalance,
          invoiceCount: invoice.length,
        };
      });

      // Get total customer counts
      const [total, active] = await Promise.all([
        this.prisma.customer.count({ where: { entityId } }),
        this.prisma.customer.count({ where: { entityId, isActive: true } }),
      ]);

      // Calculate entity-level metrics
      const totalOutstanding = customersWithMetrics.reduce((sum, c) => sum + c.outstandingBalance, 0);
      const averageBalance = customersWithMetrics.length > 0 ? totalOutstanding / customersWithMetrics.length : 0;

      return {
        customers: customersWithMetrics,
        total,
        active,
        averageBalance,
        outstandingReceivables: totalOutstanding,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateCustomer(body: UpdateCustomerDto, customerId: string, entityId: string) {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, entityId },
      });
      if (!customer)
        throw new UnauthorizedException(
          'Customer not found or does not belong to this entity!',
        );
      const updateEntityCustomer = await this.prisma.customer.update({
        where: { id: customerId, entityId },
        data: { ...body },
      });
      return updateEntityCustomer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async getCustomerById(customerId: string, entityId: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: { invoice: true },
      });

      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      if (customer.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this customer',
          HttpStatus.FORBIDDEN,
        );
      }

      return customer;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteCustomer(customerId: string, entityId: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }
      if (customer.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this customer',
          HttpStatus.FORBIDDEN,
        );
      }

      // Delete invoices first, then customer to avoid FK issues
      await this.prisma.$transaction([
        this.prisma.invoice.deleteMany({ where: { customerId } }),
        this.prisma.customer.delete({ where: { id: customerId } }),
      ]);

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}
