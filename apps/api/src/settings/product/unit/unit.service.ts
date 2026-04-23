import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductUnitDto, UpdateProductUnitDto } from './dto/unit.dto';

@Injectable()
export class ProductUnitService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductUnitDto, entityId: string, groupId: string) {
    try {
      const unit = await this.prisma.productUnit.create({
        data: { name: dto.name, abbreviation: dto.abbreviation, type: dto.type, status: dto.status ?? 'active', entityId, groupId },
      });
      return { data: unit, message: 'Unit created successfully', statusCode: 201 };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(entityId: string, groupId: string) {
    try {
      const data = await this.prisma.productUnit.findMany({ where: { entityId, groupId }, orderBy: { createdAt: 'desc' } });
      return { data, message: 'Units fetched', statusCode: 200 };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: string, dto: UpdateProductUnitDto, entityId: string) {
    try {
      const existing = await this.prisma.productUnit.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Unit not found', HttpStatus.NOT_FOUND);
      const data = await this.prisma.productUnit.update({ where: { id }, data: dto });
      return { data, message: 'Unit updated', statusCode: 200 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const existing = await this.prisma.productUnit.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Unit not found', HttpStatus.NOT_FOUND);
      await this.prisma.productUnit.delete({ where: { id } });
      return { data: null, message: 'Unit deleted', statusCode: 200 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
    }
  }
}
