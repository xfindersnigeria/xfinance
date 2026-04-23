import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(body: CreateDepartmentDto, entityId: string, groupId: string) {
    try {
      const department = await this.prisma.department.create({
        data: {
          name: body.name,
          description: body.description,
          status: body.status ?? 'active',
          entityId,
          groupId,
        },
      });
      return { data: department, message: 'Department created successfully', statusCode: 201 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll(entityId: string, groupId: string) {
    try {
      const departments = await this.prisma.department.findMany({
        where: { entityId, groupId },
        include: { _count: { select: { employees: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { data: departments, message: 'Departments fetched successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(id: string, body: UpdateDepartmentDto, groupId: string) {
    try {
      const existing = await this.prisma.department.findFirst({ where: { id, groupId } });
      if (!existing) throw new HttpException('Department not found', HttpStatus.NOT_FOUND);

      const department = await this.prisma.department.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.status !== undefined && { status: body.status }),
        },
      });
      return { data: department, message: 'Department updated successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: string, groupId: string) {
    try {
      const existing = await this.prisma.department.findFirst({ where: { id, groupId } });
      if (!existing) throw new HttpException('Department not found', HttpStatus.NOT_FOUND);

      await this.prisma.department.delete({ where: { id } });
      return { data: null, message: 'Department deleted successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
