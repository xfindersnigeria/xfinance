import { PrismaService } from '@/prisma/prisma.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  async createVendor(body: CreateVendorDto, entityId: string, groupId: string) {
    try {
      const vendorExist = await this.prisma.vendor.findUnique({
        where: { email_phone: { email: body.email, phone: body.phone } },
      });
      if (vendorExist) throw new UnauthorizedException('Vendor already exist!');

      const vendor = await this.prisma.vendor.create({
        data: {
          ...body,
          entityId,
          groupId,
        },
      });
      return vendor;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getVendors(entityId: string, query: any) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      if (query.type) where.type = query.type;
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { displayName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [vendors, totalCount] = await Promise.all([
        this.prisma.vendor.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            bills: {
              select: {
                id: true,
                total: true,
                status: true,
              },
            },
          },
        }),
        this.prisma.vendor.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      const transformed = vendors.map((v) => {
        // Calculate outstanding amount (unpaid + partial bills)
        const outstandingAmount = v.bills
          .filter((bill) => bill.status === 'unpaid' || bill.status === 'partial')
          .reduce((sum, bill) => sum + bill.total, 0);

        return {
          ...v,
          billsCount: v.bills.length,
          outstandingAmount,
          createdAt: v.createdAt.toISOString(),
        };
      });

      return {
        vendors: transformed,
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      };
    } catch (error) {
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getVendorById(vendorId: string, entityId: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          bills: {
            select: {
              id: true,
              billNumber: true,
              total: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!vendor || vendor.entityId !== entityId) {
        throw new HttpException(
          'Vendor not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Calculate outstanding amount (unpaid + partial bills)
      const outstandingAmount = vendor.bills
        .filter((bill) => bill.status === 'unpaid' || bill.status === 'partial')
        .reduce((sum, bill) => sum + bill.total, 0);

      // Calculate total bills amount
      const totalBillsAmount = vendor.bills.reduce((sum, bill) => sum + bill.total, 0);

      return {
        ...vendor,
        billsCount: vendor.bills.length,
        totalBillsAmount,
        outstandingAmount,
        createdAt: vendor.createdAt.toISOString(),
        updatedAt: vendor.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async updateVendor(vendorId: string, entityId: string, body: any) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor || vendor.entityId !== entityId) {
        throw new HttpException(
          'Vendor not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Check for duplicate email/phone (excluding current vendor)
      if ((body.email && body.email !== vendor.email) || 
          (body.phone && body.phone !== vendor.phone)) {
        const existing = await this.prisma.vendor.findFirst({
          where: {
            OR: [
              { email: body.email || vendor.email, NOT: { id: vendorId } },
              { phone: body.phone || vendor.phone, NOT: { id: vendorId } },
            ],
          },
        });
        if (existing) {
          throw new HttpException(
            'Vendor with this email or phone already exists',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const updated = await this.prisma.vendor.update({
        where: { id: vendorId },
        data: body,
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteVendor(vendorId: string, entityId: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { bills: true, expenses: true, paymentMade: true },
      });

      if (!vendor || vendor.entityId !== entityId) {
        throw new HttpException(
          'Vendor not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (vendor.bills.length > 0 || vendor.expenses.length > 0 || vendor.paymentMade.length > 0) {
        throw new HttpException(
          'Cannot delete vendor with associated records',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.vendor.delete({
        where: { id: vendorId },
      });

      return { message: 'Vendor deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }
}
