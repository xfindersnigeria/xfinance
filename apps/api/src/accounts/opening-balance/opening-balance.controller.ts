import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { OpeningBalanceService } from './opening-balance.service';
import { CreateOpeningBalanceDto, UpdateOpeningBalanceDto, GetOpeningBalanceResponseDto, GetOpeningBalancesQueryDto, GetOpeningBalancesResponseDto } from './dto/opening-balance.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('account/opening-balances')
export class OpeningBalanceController {
  constructor(private readonly openingBalanceService: OpeningBalanceService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req, @Body() dto: CreateOpeningBalanceDto): Promise<GetOpeningBalanceResponseDto> {
    const groupId = getEffectiveGroupId(req) as string;
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.openingBalanceService.createOpeningBalance(entityId, groupId, dto);
  }

  @Get('')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get opening balances (paginated + searchable)' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ type: GetOpeningBalancesResponseDto })
  async getByEntity(@Req() req, @Query() query: GetOpeningBalancesQueryDto): Promise<GetOpeningBalancesResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.openingBalanceService.getOpeningBalanceByEntity(entityId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getOne(@Req() req, @Param('id') id: string): Promise<GetOpeningBalanceResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.openingBalanceService.getOpeningBalance(id, entityId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateOpeningBalanceDto): Promise<GetOpeningBalanceResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.openingBalanceService.updateOpeningBalance(id, entityId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req, @Param('id') id: string): Promise<void> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.openingBalanceService.deleteOpeningBalance(id, entityId);
  }

  @Post(':id/finalize')
  @UseGuards(AuthGuard)
  async finalize(@Req() req, @Param('id') id: string): Promise<GetOpeningBalanceResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.openingBalanceService.finalizeOpeningBalance(id, entityId);
  }
}
