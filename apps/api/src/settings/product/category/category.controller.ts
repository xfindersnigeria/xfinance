import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ProductCategoryService } from './category.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/category.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/product/categories')
@UseGuards(AuthGuard)
export class ProductCategoryController {
  constructor(private service: ProductCategoryService) {}

  @Post()
  create(@Body() dto: CreateProductCategoryDto, @Req() req: any) {
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
  update(@Param('id') id: string, @Body() dto: UpdateProductCategoryDto, @Req() req: any) {
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
