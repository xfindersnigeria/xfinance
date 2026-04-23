import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ProductUnitService } from './unit.service';
import { CreateProductUnitDto, UpdateProductUnitDto } from './dto/unit.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/product/units')
@UseGuards(AuthGuard)
export class ProductUnitController {
  constructor(private service: ProductUnitService) {}

  @Post()
  create(@Body() dto: CreateProductUnitDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    return this.service.create(dto, entityId, groupId);
  }

  @Get()
  findAll(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    return this.service.findAll(entityId, groupId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductUnitDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.update(id, dto, entityId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.remove(id, entityId);
  }
}
