import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Patch,
  Delete,
  UnauthorizedException,
  Param,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { CreateBillDto, UpdateBillDto } from './dto/bill.dto';
import { GetBillsQueryDto } from './dto/get-bills-query.dto';
import { GetBillsResponseDto } from './dto/get-bills-response.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { Request } from 'express';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@ApiTags('Bills')
@Controller('bills')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiOperation({ summary: 'Create a new bill' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        billDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-15T10:00:00Z',
        },
        billNumber: { type: 'string', example: 'INV-001' },
        vendorId: { type: 'string', example: 'vendor-id-123' },
        dueDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-02-15T10:00:00Z',
        },
        poNumber: { type: 'string', example: 'PO-001' },
        paymentTerms: { type: 'string', example: 'Net 30' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              rate: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
        },
        total: { type: 'number', example: 5000 },
        notes: { type: 'string', example: 'Important notes' },
        attachment: { type: 'string', format: 'binary' },
      },
      required: [
        'billDate',
        'vendorId',
        'dueDate',
        'paymentTerms',
        'items',
        'total',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Bill created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'bill-id-123' },
        billDate: { type: 'string', format: 'date-time' },
        billNumber: { type: 'string' },
        vendorId: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
        poNumber: { type: 'string' },
        paymentTerms: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              rate: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
        },
        total: { type: 'number' },
        notes: { type: 'string' },
        attachment: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request or invalid input' })
  async createBill(
    @Body() body: CreateBillDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');

    return this.billsService.createBill(body, entityId, file, groupId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bills with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
 
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by bill number, vendor name, or PO number',
  })
  @ApiResponse({
    status: 200,
    description: 'Bills retrieved successfully',
    type: GetBillsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getBills(
    @Query() query: GetBillsQueryDto,
    @Req() req: Request,
  ): Promise<GetBillsResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) {
      throw new BadRequestException('Entity ID is required');
    }

    return this.billsService.getBills(entityId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill details by ID' })
  @ApiResponse({ status: 200, description: 'Bill details returned' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  async getBillById(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    const bill = await this.billsService.getBillById(entityId, id);
    if (!bill) throw new BadRequestException('Bill not found');
    return bill;
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiOperation({ summary: 'Update a bill' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        billDate: { type: 'string', format: 'date-time' },
        billNumber: { type: 'string' },
        vendorId: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
        poNumber: { type: 'string' },
        paymentTerms: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              itemId: { type: 'string' },
              rate: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
        },
        removeItemIds: { type: 'array', items: { type: 'string' } },
        total: { type: 'number' },
        notes: { type: 'string' },
        attachment: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Bill updated successfully' })
  async updateBill(
    @Param('id') id: string,
    @Body() body: UpdateBillDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');

    return this.billsService.updateBill(id, entityId, body, file, groupId);
  }

  @Patch(':id/mark-unpaid')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Mark a draft bill as unpaid (triggers journal posting)' })
  // @ApiParam({ name: 'id', description: 'Bill ID' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiResponse({ status: 200, description: 'Bill marked as unpaid successfully' })
  @ApiNotFoundResponse({ description: 'Bill not found' })
  @ApiBadRequestResponse({ description: 'Bill must be in draft status' })
  // @ApiUnauthorizedResponse({ description: 'Access denied' })
  async markBillUnpaid(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.billsService.markBillUnpaid(id, entityId, groupId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bill' })
  @ApiResponse({ status: 200, description: 'Bill deleted successfully' })
  async deleteBill(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.billsService.deleteBill(id, entityId);
  }

  @Get('failed/list')
  @ApiOperation({ summary: 'Get all failed bill postings' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Failed bills retrieved successfully',
  })
  async getFailedBills(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.billsService.getFailedBills(entityId, Number(page), Number(limit));
  }

  @Post(':id/retry-posting')
  @ApiOperation({
    summary: 'Retry failed bill journal posting',
    description: 'Requeue a failed bill posting job. Only works for bills with Failed status.',
  })
  @ApiResponse({ status: 200, description: 'Reposting job queued successfully' })
  @ApiNotFoundResponse({ description: 'Bill not found' })
  @ApiBadRequestResponse({
    description: 'Bill is not in Failed status or requeuing failed',
  })
  async retryFailedBillPosting(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');

    return this.billsService.retryFailedBillPosting(id, entityId, groupId);
  }
}
