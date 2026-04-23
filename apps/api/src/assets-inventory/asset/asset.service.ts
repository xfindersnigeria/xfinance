//
import { PrismaService } from '@/prisma/prisma.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
  ) {}
 async create(
    createAsset: CreateAssetDto,
    entityId: string,
    userId: string,
    groupId: string,
  ) {
    try {
      // Auto-generate serialNumber
      const serialNumber = `ASSET${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const asset = await this.prisma.asset.create({
        data: {
          name: createAsset.name,
          type: createAsset.type,
          departmentId: createAsset.departmentId,
          assignedId: createAsset.assignedId,
          description: createAsset.description ?? '',
          purchaseDate: new Date(createAsset.purchaseDate),
          purchaseCost: createAsset.purchaseCost,
          currentValue: createAsset.currentValue ?? createAsset.purchaseCost,
          expiryDate: createAsset.expiryDate ? new Date(createAsset.expiryDate) : new Date(),
          trackDepreciation: createAsset.trackDepreciation,
          depreciationMethod: createAsset.depreciationMethod ?? '',
          years: createAsset.years ?? 0,
          salvageValue: createAsset.salvageValue ?? 0,
          activeAsset: createAsset.activeAsset,
          serialNumber,
          entityId,
          groupId,
        },
      });
      return asset;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(entityId: string) {
    try {
      const [total, inUse, inStorage, depreciableAgg, assets] = await Promise.all([
        this.prisma.asset.count({ where: { entityId } }),
        this.prisma.asset.count({ where: { entityId, status: 'in_use' } }),
        this.prisma.asset.count({ where: { entityId, status: 'in_storage' } }),
        this.prisma.asset.aggregate({
          where: { entityId, trackDepreciation: true },
          _sum: { currentValue: true },
        }),
        this.prisma.asset.findMany({
          where: { entityId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        success: true,
        data: {
          summary: {
            total,
            inUse,
            inStorage,
            depreciableValue: depreciableAgg._sum.currentValue ?? 0,
          },
          assets,
        },
      };
    } catch (error) {
      console.error('Asset overview failed:', error);
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateAsset: UpdateAssetDto, entityId: string) {
    try {
      // Prevent serialNumber from being updated
      const { serialNumber, ...rest } = updateAsset as any;
      const asset = await this.prisma.asset.update({
        where: { id },
        data: rest,
      });
      return asset;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, entityId: string) {
    try {
      const asset = await this.prisma.asset.findFirst({
        where: { id, entityId },
      });
      if (!asset) {
        throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
      }
      return asset;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

   async remove(id: string, entityId: string) {
          try {
            // Ensure asset belongs to entity
            const asset = await this.prisma.asset.findFirst({ where: { id, entityId } });
            if (!asset) {
              throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
            }
            await this.prisma.asset.delete({ where: { id } });
            return { success: true };
          } catch (error) {
            throw new HttpException(
              `${error instanceof Error ? error.message : String(error)}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
        }
}
