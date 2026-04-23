import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SaveReconciliationDraftDto, CompleteReconciliationDto } from './dto/reconciliation.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BankingService } from './banking.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountDto } from './dto/bank-account.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { AuthGuard } from '@/auth/guards/auth.guard';

@ApiTags('Banking')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Post('accounts')
  @ApiOperation({
    summary: 'Create a new bank account',
    description:
      'Create a new bank account and auto-link to Cash and Cash Equivalents account',
  })
  @ApiBody({ type: CreateBankAccountDto })
  @ApiResponse({ status: 201, type: BankAccountDto })
  async createBankAccount(
    @Body() createBankAccountDto: CreateBankAccountDto,
    @Req() req: any,
  ) {
    const effectiveEntityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req) as string;
    return this.bankingService.createBankAccount(
      createBankAccountDto,
      effectiveEntityId,
      groupId,
    );
  }

  @Get('/accounts')
  @ApiOperation({
    summary: 'Get all bank accounts',
    description: 'Retrieve paginated list of bank accounts for the entity',
  })
  @ApiResponse({ status: 200, type: BankAccountDto, isArray: true })
  async getBankAccounts(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
@Req() req: any,) {
    const effectiveEntityId = getEffectiveEntityId(req);
    return this.bankingService.getBankAccounts(
      effectiveEntityId,
      page,
      pageSize,
    );
  }

  @Get('/accounts/:id')
  @ApiOperation({
    summary: 'Get bank account details',
    description: 'Retrieve full details of a specific bank account',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: BankAccountDto })
  async getBankAccountById(
    @Param('id') id: string,
@Req() req: any,) {
        const effectiveEntityId = getEffectiveEntityId(req);

    return this.bankingService.getBankAccountById(id, effectiveEntityId);
  }

  @Patch('/accounts/:id')
  @ApiOperation({
    summary: 'Update bank account',
    description: 'Update bank account details',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateBankAccountDto })
  @ApiResponse({ status: 200, type: BankAccountDto })
  async updateBankAccount(
    @Param('id') id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
@Req() req: any,) {
        const effectiveEntityId = getEffectiveEntityId(req);

    return this.bankingService.updateBankAccount(
      id,
      updateBankAccountDto,
      effectiveEntityId,
    );
  }

  @Delete('/accounts/:id')
  @ApiOperation({
    summary: 'Delete bank account',
    description: 'Delete a bank account (cannot have transactions)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  async deleteBankAccount(
    @Param('id') id: string,
@Req() req: any,) {
        const effectiveEntityId = getEffectiveEntityId(req);

    return this.bankingService.deleteBankAccount(id, effectiveEntityId);
  }

  @Post('/accounts/:id/transactions')
  @ApiOperation({
    summary: 'Add transaction to bank account',
    description: 'Record a new transaction for a bank account',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time' },
        description: { type: 'string' },
        category: { type: 'string' },
        amount: { type: 'number' },
        type: { enum: ['credit', 'debit'] },
        reference: { type: 'string' },
        payee: { type: 'string', description: 'Payee or payor name' },
        method: { type: 'string', description: 'Payment method (ACH, Wire, Check, Card, Transfer, Other)' },
        metadata: { type: 'object' },
      },
      required: ['date', 'description', 'amount', 'type'],
    },
  })
  @ApiResponse({ status: 201 })
  async addTransaction(
    @Param('id') id: string,
    @Body()
    transactionData: {
      date: Date;
      description: string;
      category?: string;
      amount: number;
      type: 'credit' | 'debit';
      reference?: string;
      payee?: string;
      method?: string;
      metadata?: any;
    },
@Req() req: any,) {
        const effectiveEntityId = getEffectiveEntityId(req);

    const groupId = getEffectiveGroupId(req) as string;
    return this.bankingService.addTransaction(id, transactionData, effectiveEntityId, groupId);
  }

  @Get('/accounts/:id/transactions')
  @ApiOperation({
    summary: 'Get bank account transactions',
    description: 'Retrieve paginated list of transactions for a bank account',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, isArray: true })
  async getTransactions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Req() req: any,
  ) {
    const effectiveEntityId = getEffectiveEntityId(req);
    return this.bankingService.getTransactions(id, effectiveEntityId, page, pageSize);
  }

  // ─── Reconciliation ────────────────────────────────────────────────────────

  @Get('/accounts/:id/reconciliations')
  @ApiOperation({ summary: 'List completed reconciliations for a bank account' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  async getReconciliationHistory(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req) as string;
    return this.bankingService.getReconciliationHistory(id, entityId);
  }

  @Get('/accounts/:id/reconciliations/active')
  @ApiOperation({ summary: 'Get active draft reconciliation (or null) with statement txs, book txs, and matches' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  async getActiveReconciliation(@Param('id') id: string, @Req() req: any) {
    const entityId = getEffectiveEntityId(req) as string;
    return this.bankingService.getActiveReconciliation(id, entityId);
  }

  @Put('/accounts/:id/reconciliations/draft')
  @ApiOperation({ summary: 'Save (upsert) reconciliation draft — sends full state each time' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  async saveDraft(
    @Param('id') id: string,
    @Body() dto: SaveReconciliationDraftDto,
    @Req() req: any,
  ) {
    const entityId = getEffectiveEntityId(req) as string;
    const groupId = getEffectiveGroupId(req) as string;
    const userId = req.user?.id as string;
    return this.bankingService.saveDraft(id, entityId, groupId, userId, dto);
  }

  @Post('/accounts/:id/reconciliations/complete')
  @ApiOperation({ summary: 'Complete (finalise) the reconciliation — locks it and marks book transactions as cleared' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 201 })
  async completeReconciliation(
    @Param('id') id: string,
    @Body() dto: CompleteReconciliationDto,
    @Req() req: any,
  ) {
    const entityId = getEffectiveEntityId(req) as string;
    const groupId = getEffectiveGroupId(req) as string;
    const userId = req.user?.id as string;
    return this.bankingService.completeReconciliation(id, entityId, groupId, userId, dto);
  }

  @Post('/accounts/:id/reconciliations/import')
  @ApiOperation({ summary: 'Parse a CSV bank statement file and return transactions (not saved yet)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 201 })
  @UseInterceptors(FileInterceptor('file'))
  async importStatement(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const entityId = getEffectiveEntityId(req) as string;
    await this.bankingService.validateBankAccountAccess(id, entityId);
    const transactions = this.bankingService.parseImportedCSV(file.buffer);
    return { data: transactions, count: transactions.length };
  }
}
