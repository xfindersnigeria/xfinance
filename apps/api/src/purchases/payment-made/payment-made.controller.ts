import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Param,
  Query,
  UnauthorizedException,
  Patch,
  Delete,
} from '@nestjs/common';
import { PaymentMadeService } from './payment-made.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { CreatePaymentMade } from './dto/paymet-made';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiBody,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Payment Made')
@Controller('purchases/payment-made')
export class PaymentMadeController {
  constructor(private paymentMadeService: PaymentMadeService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new payment made' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment made created successfully' })
//   @ApiUnauthorizedResponse({ description: 'Access denied' })
  async addPaymentMade(@Body() body: CreatePaymentMade, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    return this.paymentMadeService.addPaymentMade(body, entityId, groupId);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List all payments made for the entity (pagination)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payments retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getAllPayments(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentMadeService.getAllPayments(
      entityId,
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a single payment made by ID' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getPaymentMadeById(@Req() req, @Param('id') paymentMadeId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentMadeService.getPaymentMadeById(paymentMadeId, entityId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a payment made' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor ID' },
        accountId: { type: 'string', description: 'Payment account ID' },
        amount: { type: 'string', description: 'Payment amount' },
        paymentDate: {
          type: 'string',
          format: 'date-time',
          description: 'Payment date',
        },
        paymentMethod: {
          type: 'string',
          enum: ['Cash', 'Card', 'Transfer', 'Check'],
        },
        reference: { type: 'string', description: 'Payment reference' },
        note: { type: 'string', description: 'Payment note' },
        billNumber: { type: 'string', description: 'Bill number' },
      },
    },
  })
  @ApiOkResponse({ description: 'Payment updated successfully' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
//   @ApiUnauthorizedException({ description: 'Unauthorized' })
  async updatePaymentMade(
    @Req() req,
    @Param('id') paymentMadeId: string,
    @Body() body: any,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentMadeService.updatePaymentMade(
      paymentMadeId,
      entityId,
      body,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a payment made' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Payment deleted successfully' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiBadRequestResponse({ description: 'Cannot delete posted payment' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deletePaymentMade(@Req() req, @Param('id') paymentMadeId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentMadeService.deletePaymentMade(paymentMadeId, entityId);
  }

  @Get('failed/list')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all failed payment made postings' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description: 'Failed payments retrieved successfully',
  })
  async getFailedPayments(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentMadeService.getFailedPayments(
      entityId,
      Number(page),
      Number(limit),
    );
  }

  @Post(':id/retry-posting')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Retry failed payment made journal posting',
    description:
      'Requeue a failed payment made posting job. Only works for payments with Failed posting status.',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Reposting job queued successfully' })
  @ApiNotFoundResponse({ description: 'Payment Made not found' })
  @ApiBadRequestResponse({
    description:
      'Payment Made posting is not in Failed status or requeuing failed',
  })
  async retryFailedPayment(@Req() req, @Param('id') paymentMadeId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.paymentMadeService.retryFailedPayment(paymentMadeId, entityId);
  }
}
