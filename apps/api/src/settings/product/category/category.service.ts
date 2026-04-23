import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/category.dto';

@Injectable()
export class ProductCategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto, entityId: string, groupId: string) {
    try {
      const category = await this.prisma.productCategory.create({
        data: { name: dto.name, color: dto.color, description: dto.description, status: dto.status ?? 'active', entityId, groupId },
      });
      return { data: category, message: 'Category created successfully', statusCode: 201 };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(entityId: string, groupId: string) {
    try {
      const data = await this.prisma.productCategory.findMany({
        where: { entityId, groupId },
        orderBy: { createdAt: 'desc' },
      });
      return { data, message: 'Categories fetched', statusCode: 200 };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: string, dto: UpdateProductCategoryDto, entityId: string) {
    try {
      const existing = await this.prisma.productCategory.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      const data = await this.prisma.productCategory.update({ where: { id }, data: dto });
      return { data, message: 'Category updated', statusCode: 200 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const existing = await this.prisma.productCategory.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      await this.prisma.productCategory.delete({ where: { id } });
      return { data: null, message: 'Category deleted', statusCode: 200 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }
}
