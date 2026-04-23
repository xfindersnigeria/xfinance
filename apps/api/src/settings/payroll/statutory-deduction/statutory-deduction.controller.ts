import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { StatutoryDeductionService } from './statutory-deduction.service';
import { CreateStatutoryDeductionDto, UpdateStatutoryDeductionDto } from './dto/statutory-deduction.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/payroll/statutory-deductions')
@UseGuards(AuthGuard)
export class StatutoryDeductionController {
  constructor(private service: StatutoryDeductionService) {}

  @Post()
  create(@Body() dto: CreateStatutoryDeductionDto, @Req() req: any) {
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
  update(@Param('id') id: string, @Body() dto: UpdateStatutoryDeductionDto, @Req() req: any) {
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
