import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto, ToggleCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/currency')
@UseGuards(AuthGuard)
export class CurrencyController {
  constructor(private currencyService: CurrencyService) {}

  @Get()
  async findAll(@Req() req: any, @Query('active') active?: string) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    if (active === 'true') return this.currencyService.findActive(groupId);
    return this.currencyService.findAll(groupId);
  }

  @Post()
  async create(@Body() body: CreateCurrencyDto, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.currencyService.create(body, groupId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCurrencyDto, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.currencyService.update(id, body, groupId);
  }

  @Patch(':id/toggle')
  async toggleActive(@Param('id') id: string, @Body() body: ToggleCurrencyDto, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.currencyService.toggleActive(id, body, groupId);
  }

  @Patch(':id/set-primary')
  async setPrimary(@Param('id') id: string, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.currencyService.setPrimary(id, groupId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.currencyService.remove(id, groupId);
  }
}
