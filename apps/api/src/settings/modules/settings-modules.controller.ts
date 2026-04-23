import { Body, Controller, Patch, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SettingsModulesService } from './settings-modules.service';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

class MenuToggleDto {
  @IsNotEmpty()
  @IsString()
  menuName: string;

  @IsBoolean()
  enabled: boolean;
}

@Controller('settings/modules')
@UseGuards(AuthGuard)
export class SettingsModulesController {
  constructor(private service: SettingsModulesService) {}

  @Patch('menu-toggle')
  async toggleMenu(@Body() dto: MenuToggleDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    return this.service.toggleMenu(dto.menuName, dto.enabled, entityId, groupId);
  }
}
