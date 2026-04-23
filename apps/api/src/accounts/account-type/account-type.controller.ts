import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountTypeService } from './account-type.service';
import {
  CreateAccountTypeDto,
  UpdateAccountTypeDto,
} from './dto/account-type.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';

@ApiTags('Account Type')
@Controller('account-type')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AccountTypeController {
  constructor(private accountTypeService: AccountTypeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account type (Admin only)' })
  @ApiBody({ type: CreateAccountTypeDto })
  @ApiResponse({ status: 201, description: 'Account type created' })
  async create(@Body() dto: CreateAccountTypeDto) {
    if (!dto.code) {
      throw new BadRequestException('Code is required for account type');
    }
    return this.accountTypeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all account types' })
  @ApiResponse({ status: 200, description: 'List of account types' })
  async findAll() {
    return this.accountTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account type by ID' })
  @ApiResponse({ status: 200, description: 'Account type details' })
  async findOne(@Param('id') id: string) {
    return this.accountTypeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account type' })
  @ApiBody({ type: UpdateAccountTypeDto })
  @ApiResponse({ status: 200, description: 'Account type updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountTypeDto,
  ) {
    return this.accountTypeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account type' })
  @ApiResponse({ status: 200, description: 'Account type deleted' })
  async delete(@Param('id') id: string) {
    return this.accountTypeService.delete(id);
  }
}
