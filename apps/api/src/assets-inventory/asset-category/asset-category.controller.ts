import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { AssetCategoryService } from './asset-category.service';
import { CreateAssetCategoryDto, UpdateAssetCategoryDto } from './dto/asset-category.dto';

@ApiTags('Asset Category')
@Controller('asset-categories')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AssetCategoryController {
  constructor(private service: AssetCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create an asset category' })
  create(@Body() dto: CreateAssetCategoryDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId || !groupId) throw new UnauthorizedException('Access denied');
    return this.service.create(dto, entityId, groupId);
  }

  @Get()
  @ApiOperation({ summary: 'List asset categories with asset counts' })
  findAll(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.findAll(entityId);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Depreciation schedule per category for the current fiscal year' })
  schedule(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.schedule(entityId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an asset category' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetCategoryDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.update(id, dto, entityId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an asset category (only when no assets use it)' })
  remove(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    return this.service.remove(id, entityId);
  }
}
