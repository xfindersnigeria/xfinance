import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PaymentReceivedService } from './payment-received.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import {
  CreatePaymentReceivedDto,
  UpdatePaymentReceivedDto,
} from './dto/payment-received.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Payment Received')
@Controller('sales/payments-received')
export class PaymentReceivedController {
  constructor(private paymentReceivedService: PaymentReceivedService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a payment record for an invoice' })
  @ApiBody({ type: CreatePaymentReceivedDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment record created successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({
    description:
      'You do not have permission to create payment for this invoice',
  })
  async createPaymentReceived(
    @Body() body: CreatePaymentReceivedDto,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    const userId = req.user?.id;
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req) as string;
    return this.paymentReceivedService.createPaymentReceived(
      body,
      entityId,
      userId,
      groupId,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all payment records for entity (paginated)',
  })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment records list with stats' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getPaymentRecords(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentReceivedService.getEntityPaymentRecords(
      entityId,
      page,
      limit,
      { search },
    );
  }

  @Get(':paymentId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a payment record by ID with invoice details' })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment Record ID',
    type: 'string',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment record with invoice details' })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access this payment record',
  })
  async getPaymentReceived(@Req() req, @Param('paymentId') paymentId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentReceivedService.getPaymentReceivedById(
      paymentId,
      entityId,
    );
  }

  @Patch(':paymentId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a payment record' })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment Record ID',
    type: 'string',
  })
  @ApiBody({ type: UpdatePaymentReceivedDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment record updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this payment record',
  })
  async updatePaymentReceived(
    @Req() req,
    @Param('paymentId') paymentId: string,
    @Body() body: UpdatePaymentReceivedDto,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentReceivedService.updatePaymentReceived(
      paymentId,
      entityId,
      body,
    );
  }

  @Delete(':paymentId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a payment record' })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment Record ID',
    type: 'string',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment record deleted successfully' })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to delete this payment record',
  })
  async deletePaymentReceived(
    @Req() req,
    @Param('paymentId') paymentId: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentReceivedService.deletePaymentReceived(
      paymentId,
      entityId,
    );
  }

  @Get('reports/summary')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary:
      'Get all payment records with detailed stats (paid, partially paid, current month)',
  })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description:
      'Payment records with stats (totalPaidInvoices, currentMonthPaidTotal, totalPartiallyPaidInvoices)',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getAllPaymentReceivedWithStats(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentReceivedService.getAllPaymentReceivedWithStats(
      entityId,
      page,
      limit,
      { search, from, to },
    );
  }
}
