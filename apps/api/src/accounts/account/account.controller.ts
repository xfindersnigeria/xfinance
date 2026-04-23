import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from './account.service';
import {
  AccountResponseDto,
  CreateAccountDto,
  OpeningBalanceDto,
  UpdateAccountDto,
} from './dto/account.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';

@ApiTags('Account')
@Controller('account')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AccountController {
  constructor(private accountService: AccountService) {}
  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: 201, description: 'Account created' })
  async create(@Body() account: CreateAccountDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.accountService.create(account, entityId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts for the entity' })
  @ApiResponse({
    status: 200,
    description: 'List of accounts with pagination',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  
  async findAll(
    @Req() req: Request,
    @Query('subCategory') subCategory?: string,
    @Query('search') search?: string,

    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    
    if (!page || !limit) {
      return this.accountService.findAll(entityId, subCategory, type, search, groupId);
    }
    
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.max(1, parseInt(limit));
    
    return this.accountService.findAll(entityId, subCategory, type, search, groupId, pageNum, pageSizeNum);
  }

  @Post(':entityId/opening-balances')
  @ApiOperation({
    summary: 'Set opening balances for multiple accounts in bulk',
  })
  @ApiBody({
    description:
      'Payload for bulk opening balances, where each line is a separate record for a different account',
    type: OpeningBalanceDto,
    examples: {
      bulkExample: {
        summary: 'Example bulk payload with two separate records',
        value: {
          lines: [
            {
              accountId: 'example-account-id-1',
              debit: 1000,
              credit: 500,
            },
            {
              accountId: 'example-account-id-2',
              debit: 0,
              credit: 2000,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Opening balances set successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access to account.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async setOpeningBalances(
    @Body() dto: OpeningBalanceDto,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.accountService.setOpeningBalances(entityId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account by ID' })
  @ApiResponse({ status: 200, description: 'Account retrieved' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AccountResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.accountService.findOne(id, entityId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ status: 200, description: 'Account updated' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async update(
    @Param('id') id: string,
    @Body() account: UpdateAccountDto,
    @Req() req: Request,
  ): Promise<AccountResponseDto> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.accountService.update(id, account, entityId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.accountService.delete(id, entityId);
  }
}
