import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/department')
@UseGuards(AuthGuard)
export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  @Post()
  async create(@Body() body: CreateDepartmentDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.departmentService.create(body, entityId, groupId);
  }

  @Get()
  async findAll(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.departmentService.findAll(entityId, groupId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateDepartmentDto, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.departmentService.update(id, body, groupId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.departmentService.remove(id, groupId);
  }
}
