import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductBrandDto, UpdateProductBrandDto } from './dto/brand.dto';

@Injectable()
export class ProductBrandService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductBrandDto, entityId: string, groupId: string) {
    try {
      const brand = await this.prisma.productBrand.create({
        data: { name: dto.name, description: dto.description, status: dto.status ?? 'active', entityId, groupId },
      });
      return { data: brand, message: 'Brand created successfully', statusCode: 201 };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(entityId: string, groupId: string) {
    try {
      const data = await this.prisma.productBrand.findMany({ where: { entityId, groupId }, orderBy: { createdAt: 'desc' } });
      return { data, message: 'Brands fetched', statusCode: 200 };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: string, dto: UpdateProductBrandDto, entityId: string) {
    try {
      const existing = await this.prisma.productBrand.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Brand not found', HttpStatus.NOT_FOUND);
      const data = await this.prisma.productBrand.update({ where: { id }, data: dto });
      return { data, message: 'Brand updated', statusCode: 200 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const existing = await this.prisma.productBrand.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Brand not found', HttpStatus.NOT_FOUND);
      await this.prisma.productBrand.delete({ where: { id } });
      return { data: null, message: 'Brand deleted', statusCode: 200 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }
}
