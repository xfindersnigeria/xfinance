import { Body, Controller, Get, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class AdjustStockDto {
  @IsNotEmpty() @IsString() itemId: string;
  @IsEnum(['add', 'remove', 'set']) type: 'add' | 'remove' | 'set';
  @IsNumber() @Min(0) quantity: number;
  @IsNotEmpty() @IsString() reason: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private service: InventoryService) {}

  @Get()
  getInventory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.getInventory(entityId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      status,
    });
  }

  @Post('adjust')
  adjustStock(@Body() dto: AdjustStockDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    return this.service.adjustStock(dto, entityId, groupId);
  }

  @Get('movements')
  getMovements(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('itemId') itemId?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.getMovements(entityId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      itemId,
    });
  }

  @Get('low-stock')
  getLowStock(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.getLowStockItems(entityId);
  }
}
