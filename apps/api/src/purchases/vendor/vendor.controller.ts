import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { GetVendorsQueryDto } from './dto/get-vendors-query.dto';
import { GetVendorsResponseDto } from './dto/get-vendors-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

@ApiTags('Vendors')
@Controller('purchases/vendors')
export class VendorController {
  constructor(private vendorService: VendorService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a vendor for the current entity' })
  @ApiBody({ type: CreateVendorDto })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async create(@Body() body: CreateVendorDto, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req) as string;
    return this.vendorService.createVendor(body, entityId, groupId);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'List vendors for the entity (pagination + search)',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ type: GetVendorsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getVendors(@Req() req, @Query() query: GetVendorsQueryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.vendorService.getVendors(entityId, query);
  }

  @Get(':vendorId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get vendor details by ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Vendor details retrieved' })
  @ApiNotFoundResponse({ description: 'Vendor not found' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getVendorById(@Param('vendorId') vendorId: string, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.vendorService.getVendorById(vendorId, entityId);
  }

  @Patch(':vendorId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update vendor details' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiBody({ type: UpdateVendorDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Vendor updated successfully' })
  @ApiNotFoundResponse({ description: 'Vendor not found' })
  @ApiBadRequestResponse({ description: 'Invalid input or business rule violation' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async updateVendor(
    @Param('vendorId') vendorId: string,
    @Body() body: UpdateVendorDto,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.vendorService.updateVendor(vendorId, entityId, body);
  }

  @Delete(':vendorId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a vendor' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Vendor deleted successfully' })
  @ApiNotFoundResponse({ description: 'Vendor not found' })
  @ApiBadRequestResponse({ description: 'Cannot delete vendor with associated records' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async deleteVendor(@Param('vendorId') vendorId: string, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.vendorService.deleteVendor(vendorId, entityId);
  }
}
