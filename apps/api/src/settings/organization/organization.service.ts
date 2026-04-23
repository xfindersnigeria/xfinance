import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UpdateEntityConfigDto } from './dto/organization';
import { FileuploadService } from '@/fileupload/fileupload.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService,
   private fileuploadService: FileuploadService
  ) {}

  /**
   * Update entity configuration
   */
  async updateEntityConfiguration(
    entityId: string,
    body: UpdateEntityConfigDto,
    file: Express.Multer.File,
    groupId?: string,
  ) {
    try {
      // Check if entity exists
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
      }); 

      if (!entity) {
        throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);
      }

            let logo: any = undefined;

      // Upload logo to Cloudinary if provided
      if (file) {
        const folder = groupId
          ? this.fileuploadService.buildAssetPath(groupId, entityId)
          : `entities/${entityId}`;
        logo = await this.fileuploadService.uploadFile(file, folder);
      }

      const logoData = {
        publicId: logo?.publicId || '',
        secureUrl: logo?.secureUrl || '',
      };

      // Update entity with new configuration
      const updatedEntity = await this.prisma.entity.update({
        where: { id: entityId },
        data: {
          logo: logoData,
          legalName: body.legalName || entity.legalName,
          taxId: body.taxId || entity.taxId,
          companyName: body.companyName || entity.companyName,
          address: body.address || entity.address,
          yearEnd: body.yearEnd || entity.yearEnd,
          phoneNumber: body.phoneNumber || entity.phoneNumber,
          email: body.email || entity.email,
        },
      });

      return {
        success: true,
        message: 'Entity configuration updated successfully',
        data: updatedEntity,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get entity configuration
   */
  async getEntityConfiguration(entityId: string) {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          name: true,
          logo: true,
          legalName: true,
          taxId: true,
          companyName: true,
          address: true,
          yearEnd: true,
          phoneNumber: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          email: true,
          website: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!entity) {
        throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: entity,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}