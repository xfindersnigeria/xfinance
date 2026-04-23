import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
  Patch,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpensesService } from './expenses.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { CreateExpenseDto } from './dto/expense.dto';
import { GetExpensesQueryDto } from './dto/get-expenses-query.dto';
import { GetExpensesResponseDto } from './dto/get-expenses-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiConsumes,
  ApiBody,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Expenses')
@Controller('purchases/expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiOperation({ summary: 'Create an expense with optional file attachment' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time' },
        reference: { type: 'string' },
        vendorId: { type: 'string' },
        paymentMethod: {
          type: 'string',
          enum: ['Cash', 'Card', 'Transfer', 'Check'],
        },
        accountId: { type: 'string' },
        amount: { type: 'integer' },
        tax: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        attachment: { type: 'string', format: 'binary' },
      },
      required: [
        'date',
        'reference',
        'vendorId',
        'paymentMethod',
        'amount',
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async createExpense(
    @Body() body: CreateExpenseDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.createExpense(
      {
        ...body,
        amount: body.amount ? Number(body.amount) : 0,
        tags: body.tags
          ? Array.isArray(body.tags)
            ? body.tags
            : [body.tags]
          : [],
      },
      entityId,
      file,
      groupId,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'List expenses for the entity (pagination + search)',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ type: GetExpensesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getExpenses(@Req() req, @Query() query: GetExpensesQueryDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.getExpenses(entityId, query);
  }

  @Patch(':expenseId/approve')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Approve a pending expense' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Expense approved successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async approveExpense(@Req() req, @Param('expenseId') expenseId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.approveExpense(expenseId, entityId);
  }

  @Patch(':expenseId')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiOperation({ summary: 'Update an expense' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Expense updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async updateExpense(
    @Req() req,
    @Param('expenseId') expenseId: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.updateExpense(
      expenseId,
      entityId,
      {
        ...body,
        amount: body.amount ? Number(body.amount) : undefined,
        tags: body.tags
          ? Array.isArray(body.tags)
            ? body.tags
            : [body.tags]
          : undefined,
      },
      file,
      groupId,
    );
  }

  @Delete(':expenseId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Expense deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async deleteExpense(@Req() req, @Param('expenseId') expenseId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.deleteExpense(expenseId, entityId);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Update expense status (draft → approved/rejected)',
    description: 'Update expense status. draft → approved triggers journal posting',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'approved', 'rejected'],
          description: 'New status',
        },
      },
      required: ['status'],
    },
  })
  @ApiOkResponse({ description: 'Status updated successfully' })
  @ApiNotFoundResponse({ description: 'Expense not found' })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async updateExpenseStatus(
    @Req() req,
    @Param('id') expenseId: string,
    @Body() body: { status: string },
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    if (!body.status) throw new BadRequestException('Status is required');
    return this.expensesService.updateExpenseStatus(
      expenseId,
      entityId,
      body.status,
    );
  }

  @Get('failed/list')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all failed expense postings' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({
    description: 'Failed expenses retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getFailedExpenses(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.getFailedExpenses(
      entityId,
      Number(page),
      Number(limit),
    );
  }

  @Post(':id/retry-posting')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Retry failed expense journal posting',
    description:
      'Requeue a failed expense posting job. Only works for expenses with Failed posting status.',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Reposting job queued successfully' })
  @ApiNotFoundResponse({ description: 'Expense not found' })
  @ApiBadRequestResponse({
    description:
      'Expense posting is not in Failed status or requeuing failed',
  })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async retryFailedExpense(@Req() req, @Param('id') expenseId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.expensesService.retryFailedExpense(expenseId, entityId);
  }
}
