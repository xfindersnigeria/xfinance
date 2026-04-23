import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { FileuploadService } from '@/fileupload/fileupload.service';
import {
  CreateEmployeeDto,
  EmployeeResponseDto,
  EmployeeStatsDto,
} from './dto/employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileuploadService: FileuploadService,
  ) {}

  async create(
    employeeData: CreateEmployeeDto,
    profileImage: Express.Multer.File,
    entityId: string,
    groupId: string,
  ): Promise<EmployeeResponseDto> {
    try {
      let profileImageData: { publicId: any; secureUrl: any } | null = null;
      // Step 1: File upload (if any)
      if (profileImage) {
        try {
          const folder = this.fileuploadService.buildAssetPath(
            groupId,
            entityId,
            'employee-profiles',
          );
          const uploadResult = await this.fileuploadService.uploadFile(
            profileImage,
            folder,
          );
          profileImageData = {
            publicId: uploadResult.publicId,
            secureUrl: uploadResult.secureUrl,
          };
        } catch (uploadErr) {
          console.error('File upload failed, skipping image:', uploadErr);
          // Continue without profileImageData
        }
      }

      // Step 2: Generate employeeId
      const employeeId = `EMP${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Step 3: Create employee in DB
      let employee;
      try {
        // const { ...rest } = employeeData as any;
        employee = await this.prisma.employee.create({
          data: {
            ...employeeData,
            departmentId: employeeData.departmentId,
            anualLeave: Number(employeeData.anualLeave) || 0,
            salary: Number(employeeData.salary) || 0,
            allowances: Number(employeeData.allowances) || 0,
            employeeId,
            addressInfo: employeeData.addressInfo as any,
            emergencyContact: employeeData.emergencyContact as any,
            profileImage: profileImageData as any,
            entityId,
            groupId,
          },
        });
      } catch (dbErr) {
        console.error('DB create failed:', dbErr);
        throw new HttpException(
          `DB create failed: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return employee as EmployeeResponseDto;
    } catch (error) {
      console.error('EmployeeService.create error:', error);
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, entityId: string): Promise<EmployeeResponseDto> {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id, entityId },
      });
      if (!employee)
        throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      return employee as any;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    entityId: string,
    updateData: Partial<CreateEmployeeDto>,
    profileImage?: Express.Multer.File,
    groupId?: string,
  ): Promise<EmployeeResponseDto> {
    try {
      console.log('Updating employee with data:', { id });
      let profileImageData: { publicId: any; secureUrl: any } | null = null;
      if (profileImage) {
        const folder = groupId
          ? this.fileuploadService.buildAssetPath(
              groupId,
              entityId,
              'employee-profiles',
            )
          : 'employee-profiles';
        const uploadResult = await this.fileuploadService.uploadFile(
          profileImage,
          folder,
        );
        profileImageData = {
          publicId: uploadResult.publicId,
          secureUrl: uploadResult.secureUrl,
        };
      }
      const data: any = {
        ...updateData,
        anualLeave: updateData.anualLeave
          ? Number(updateData.anualLeave)
          : undefined,
        salary: updateData.salary ? Number(updateData.salary) : undefined,
        allowances: updateData.allowances
          ? Number(updateData.allowances)
          : undefined,
        addressInfo: updateData.addressInfo as any,
        emergencyContact: updateData.emergencyContact as any,
      };
      if (profileImageData) data.profileImage = profileImageData;
      // Use id only for unique lookup (entityId can be checked in logic if needed)
      const employee = await this.prisma.employee.update({
        where: { id },
        data,
      });
      return employee as any;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string, entityId: string): Promise<{ deleted: boolean }> {
    try {
      await this.prisma.employee.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    entityId: string,
    params: { search?: string; page?: number; limit?: number } = {},
  ): Promise<{ employees: EmployeeResponseDto[]; stats: EmployeeStatsDto; pagination: any }> {
    try {
      const { search, page = 1, limit = 50 } = params;
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { position: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [employees, totalCount] = await Promise.all([
        this.prisma.employee.findMany({
          where,
          include: { dept: { select: { name: true, id: true } } },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.employee.count({ where }),
      ]);

      const employeesData = employees.map((emp) => ({
        ...emp,
        addressInfo:
          typeof emp.addressInfo === 'string'
            ? JSON.parse(emp.addressInfo || '{}')
            : emp.addressInfo,
        emergencyContact:
          typeof emp.emergencyContact === 'string'
            ? JSON.parse(emp.emergencyContact || '{}')
            : emp.emergencyContact,
      }));

      // Stats always reflect all employees, not the filtered page
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalEmployees, totalActive, totalOnLeave, totalHiredThisMonth] =
        await Promise.all([
          this.prisma.employee.count({ where: { entityId } }),
          this.prisma.employee.count({ where: { entityId, status: 'Active' } }),
          this.prisma.employee.count({ where: { entityId, status: 'On_Leave' } }),
          this.prisma.employee.count({
            where: { entityId, dateOfHire: { gte: startOfMonth } },
          }),
        ]);

      const stats: EmployeeStatsDto = {
        totalEmployees,
        totalActive,
        totalOnLeave,
        totalHiredThisMonth,
      };

      return {
        employees: employeesData as any[],
        stats,
        pagination: {
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          limit,
        },
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
