import { Body, Controller, Get, Patch, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { UpdateEntityConfigDto } from './dto/config.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/config')
@UseGuards(AuthGuard)
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get()
  async getConfig(@Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.configService.getEntityConfig(entityId, groupId);
  }

  @Patch()
  async updateConfig(@Body() body: UpdateEntityConfigDto, @Req() req: any) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.configService.updateEntityConfig(entityId, groupId, body);
  }
}
