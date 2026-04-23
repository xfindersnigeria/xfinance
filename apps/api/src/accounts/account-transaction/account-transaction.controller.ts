import {
  Controller,
  Get,
  BadRequestException,
  Query,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AccountTransactionService } from './account-transaction.service';
import { GetAccountTransactionsFilterDto } from './dto/account-transaction.dto';
import { getEffectiveEntityId } from '@/auth/utils/context.util';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';

@ApiTags('Account Transactions')
@Controller('account-transactions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AccountTransactionController {
  constructor(private readonly transactionService: AccountTransactionService) {}

  /**
   * Get all account transactions with advanced filtering, search, and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get all account transactions with filters',
    description: `
      Retrieves all account transactions for the entity with support for:
      - Filter by type (BANK, INVOICE_POSTING, PAYMENT_RECEIVED_POSTING, etc.)
      - Filter by status (Pending, Processing, Success, Failed)
      - Filter by account or bank account
      - Filter by date range (fromDate to toDate)
      - Full-text search in description and reference
      - Pagination with page and pageSize
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'List of account transactions with pagination',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getAllTransactions(
    @Req() req: Request,
    @Query() filters: GetAccountTransactionsFilterDto,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.transactionService.getTransactions(entityId, filters);
  }

  /**
   * Get transactions for a specific account
   */
  @Get('account/:accountId')
  @ApiOperation({
    summary: 'Get transactions for a specific account',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions for the account',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountTransactions(
    @Param('accountId') accountId: string,
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    const pageNum = page ? Math.max(1, parseInt(page)) : 1;
    const pageSizeNum = pageSize ? Math.max(1, parseInt(pageSize)) : 20;

    return this.transactionService.getAccountTransactions(
      accountId,
      entityId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * Get transactions for a specific bank account
   */
  // @Get('bank/:bankAccountId')
  // @ApiOperation({
  //   summary: 'Get transactions for a specific bank account',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Transactions for the bank account',
  // })
  // @ApiResponse({ status: 404, description: 'Bank account not found' })
  // async getBankAccountTransactions(
  //   @Param('bankAccountId') bankAccountId: string,
  //   @Req() req: Request,
  //   @Query('page') page?: string,
  //   @Query('pageSize') pageSize?: string,
  // ) {
  //   const entityId = getEffectiveEntityId(req);
  //   if (!entityId) throw new BadRequestException('Entity ID is required');

  //   const pageNum = page ? Math.max(1, parseInt(page)) : 1;
  //   const pageSizeNum = pageSize ? Math.max(1, parseInt(pageSize)) : 20;

  //   return this.transactionService.getBankAccountTransactions(
  //     bankAccountId,
  //     entityId,
  //     pageNum,
  //     pageSizeNum,
  //   );
  // }

  /**
   * Get a specific transaction by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific transaction by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction details',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.transactionService.getTransactionById(id, entityId);
  }

  /**
   * Get transaction summary and statistics
   */
  @Get('summary/stats')
  @ApiOperation({
    summary: 'Get transaction summary and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction summary',
  })
  async getTransactionSummary(
    @Req() req: Request,
    @Query('accountId') accountId?: string,
    @Query('bankAccountId') bankAccountId?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');

    return this.transactionService.getTransactionSummary(
      entityId,
      accountId,
    );
  }
}
