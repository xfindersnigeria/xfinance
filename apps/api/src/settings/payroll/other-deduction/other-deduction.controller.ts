import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { OtherDeductionService } from './other-deduction.service';
import { CreateOtherDeductionDto, UpdateOtherDeductionDto } from './dto/other-deduction.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/payroll/other-deductions')
@UseGuards(AuthGuard)
export class OtherDeductionController {
  constructor(private service: OtherDeductionService) {}

  @Post()
  create(@Body() dto: CreateOtherDeductionDto, @Req() req: any) {
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
  update(@Param('id') id: string, @Body() dto: UpdateOtherDeductionDto, @Req() req: any) {
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
