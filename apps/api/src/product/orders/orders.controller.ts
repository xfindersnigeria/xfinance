import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { OrdersService } from './orders.service';
import {
  CancelOrderDto,
  CompleteOrderDto,
  GetOrdersQueryDto,
  PosCheckoutDto,
  PublicOrderDto,
  UpdateStoreSettingsDto,
} from './dto/orders.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class OrdersController {
  constructor(private service: OrdersService) {}

  private ctx(req: any) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId || !groupId) throw new UnauthorizedException('Access denied');
    return { entityId, groupId };
  }

  @Post('pos-checkout')
  @ApiOperation({ summary: 'POS / Quick Sale: charge a cart — takes stock, creates the receipt, posts to the ledger' })
  posCheckout(@Body() dto: PosCheckoutDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.posCheckout(entityId, groupId, req.user?.id ?? null, dto);
  }

  @Get()
  @ApiOperation({ summary: 'POS and online store orders, with today’s stats' })
  list(@Query() q: GetOrdersQueryDto, @Req() req: any) {
    return this.service.list(this.ctx(req).entityId, q);
  }

  @Get('store')
  @ApiOperation({ summary: 'Online store settings (link + published)' })
  storeSettings(@Req() req: any) {
    return this.service.getStoreSettings(this.ctx(req).entityId);
  }

  @Patch('store')
  @ApiOperation({ summary: 'Publish/unpublish the online store or change its link' })
  updateStoreSettings(@Body() dto: UpdateStoreSettingsDto, @Req() req: any) {
    return this.service.updateStoreSettings(this.ctx(req).entityId, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.service.get(id, this.ctx(req).entityId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark a pending online order as paid' })
  complete(@Param('id') id: string, @Body() dto: CompleteOrderDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.complete(id, entityId, groupId, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending online order' })
  cancel(@Param('id') id: string, @Body() dto: CancelOrderDto, @Req() req: any) {
    return this.service.cancel(id, this.ctx(req).entityId, dto);
  }
}

/** Simple per-IP limit for anonymous order placement (single API process) */
const ORDER_WINDOW_MS = 10 * 60 * 1000;
const ORDERS_PER_WINDOW = 10;
const recentOrders = new Map<string, number[]>();

function assertOrderRate(ip: string) {
  const now = Date.now();
  const hits = (recentOrders.get(ip) ?? []).filter((t) => now - t < ORDER_WINDOW_MS);
  if (hits.length >= ORDERS_PER_WINDOW) {
    throw new HttpException('Too many orders — please try again in a few minutes', HttpStatus.TOO_MANY_REQUESTS);
  }
  hits.push(now);
  recentOrders.set(ip, hits);
  if (recentOrders.size > 10_000) recentOrders.clear();
}

/** The public online store — no auth, served only while the store is published */
@ApiTags('Public Store')
@Controller('public/store')
export class PublicStoreController {
  constructor(private service: OrdersService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Storefront: business details + items marked "Sell online"' })
  store(@Param('slug') slug: string, @Req() req: any) {
    return this.service.getPublicStore(slug, req.tenantId);
  }

  @Post(':slug/orders')
  @ApiOperation({ summary: 'Place an order — the business contacts the customer for payment' })
  placeOrder(@Param('slug') slug: string, @Body() dto: PublicOrderDto, @Req() req: any) {
    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim();
    assertOrderRate(ip || 'unknown');
    return this.service.placePublicOrder(slug, dto, req.tenantId);
  }
}
