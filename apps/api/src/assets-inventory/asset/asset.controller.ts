import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';

@ApiTags('Asset')
@Controller('asset')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AssetController {
  constructor(private assetsService: AssetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async create(@Body() createAssetDto: CreateAssetDto, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required to continue');
    const userId = req.user?.id as string;
    const groupId = getEffectiveGroupId(req) as string;
    // assignedId is employee id, serialNumber is auto-generated in service
    return this.assetsService.create(createAssetDto, entityId, userId, groupId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  async update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.assetsService.update(id, updateAssetDto, entityId);
  }
  @Get()
  @ApiOperation({ summary: 'Get all assets' })
  @ApiQuery({ name: 'search', required: false, description: 'Name, serial number or category' })
  @ApiQuery({ name: 'categoryId', required: false, description: "Category id, or 'uncategorised'" })
  @ApiResponse({ status: 200, description: 'List of assets' })
  async findAll(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required here');
    return this.assetsService.findAll(entityId, { search, categoryId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Asset found' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.assetsService.findOne(id, entityId);
  }
}
