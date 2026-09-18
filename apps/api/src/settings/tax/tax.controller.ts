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
import { TaxService } from './tax.service';
import {
  CreateTaxExemptionDto,
  CreateTaxGroupDto,
  CreateTaxJurisdictionDto,
  CreateTaxRateDto,
  UpdateTaxConfigDto,
  UpdateTaxExemptionDto,
  UpdateTaxGroupDto,
  UpdateTaxJurisdictionDto,
  UpdateTaxRateDto,
} from './dto/tax.dto';

@ApiTags('Settings - Tax')
@Controller('settings/tax')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class TaxController {
  constructor(private service: TaxService) {}

  private ctx(req: any) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId || !groupId) throw new UnauthorizedException('Access denied');
    return { entityId, groupId };
  }

  @Get()
  @ApiOperation({ summary: 'Tax configuration, rates, groups, exemptions and jurisdictions' })
  overview(@Req() req: any) {
    return this.service.getOverview(this.ctx(req).entityId);
  }

  @Get('options')
  @ApiOperation({ summary: 'Default tax + pickable taxes for invoice/receipt/bill/POS forms' })
  options(@Req() req: any) {
    return this.service.getFormOptions(this.ctx(req).entityId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update the tax configuration switches' })
  updateConfig(@Body() dto: UpdateTaxConfigDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.updateConfig(entityId, groupId, dto);
  }

  // Tax rates
  @Post('rates')
  createRate(@Body() dto: CreateTaxRateDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.createRate(entityId, groupId, dto);
  }

  @Patch('rates/:id')
  updateRate(@Param('id') id: string, @Body() dto: UpdateTaxRateDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.updateRate(id, entityId, groupId, dto);
  }

  @Delete('rates/:id')
  deleteRate(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteRate(id, this.ctx(req).entityId);
  }

  // Tax groups
  @Post('groups')
  createGroup(@Body() dto: CreateTaxGroupDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.createGroup(entityId, groupId, dto);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateTaxGroupDto, @Req() req: any) {
    return this.service.updateGroup(id, this.ctx(req).entityId, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteGroup(id, this.ctx(req).entityId);
  }

  // Exemptions
  @Post('exemptions')
  createExemption(@Body() dto: CreateTaxExemptionDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.createExemption(entityId, groupId, dto);
  }

  @Patch('exemptions/:id')
  updateExemption(@Param('id') id: string, @Body() dto: UpdateTaxExemptionDto, @Req() req: any) {
    return this.service.updateExemption(id, this.ctx(req).entityId, dto);
  }

  @Delete('exemptions/:id')
  deleteExemption(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteExemption(id, this.ctx(req).entityId);
  }

  // Jurisdictions
  @Post('jurisdictions')
  createJurisdiction(@Body() dto: CreateTaxJurisdictionDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.createJurisdiction(entityId, groupId, dto);
  }

  @Patch('jurisdictions/:id')
  updateJurisdiction(@Param('id') id: string, @Body() dto: UpdateTaxJurisdictionDto, @Req() req: any) {
    return this.service.updateJurisdiction(id, this.ctx(req).entityId, dto);
  }

  @Delete('jurisdictions/:id')
  deleteJurisdiction(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteJurisdiction(id, this.ctx(req).entityId);
  }
}
