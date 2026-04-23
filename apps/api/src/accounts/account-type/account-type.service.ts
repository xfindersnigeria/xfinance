import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateAccountTypeDto,
  UpdateAccountTypeDto,
} from './dto/account-type.dto';

@Injectable()
export class AccountTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountTypeDto) {
    try {
      return await this.prisma.accountType.create({
        data: dto,
      });
    } catch (error) {
      throw new HttpException(
        `Failed to create account type: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    try {
      return await this.prisma.accountType.findMany({
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account types: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string) {
    try {
      const accountType = await this.prisma.accountType.findUnique({
        where: { id },
      });
      if (!accountType) {
        throw new HttpException(
          'Account type not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return accountType;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account type: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCode(code: string) {
    try {
      return await this.prisma.accountType.findUnique({
        where: { code },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account type: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, dto: UpdateAccountTypeDto) {
    try {
      return await this.prisma.accountType.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      throw new HttpException(
        `Failed to update account type: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.accountType.delete({
        where: { id },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to delete account type: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
