import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
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
import { Request } from 'express';
import { AccountCategoryService } from './account-category.service';
import {
  CreateAccountCategoryDto,
  UpdateAccountCategoryDto,
} from './dto/account-category.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveGroupId } from '@/auth/utils/context.util';

@ApiTags('Account Category')
@Controller('account-category')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AccountCategoryController {
  constructor(private accountCategoryService: AccountCategoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new account category for the group',
  })
  @ApiBody({ type: CreateAccountCategoryDto })
  @ApiResponse({ status: 201, description: 'Account category created' })
  async create(@Body() dto: CreateAccountCategoryDto, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.accountCategoryService.create(dto, groupId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all account categories for the group' })
  @ApiResponse({ status: 200, description: 'List of account categories' })
  async findAll(@Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.accountCategoryService.findAllByGroup(groupId);
  }

  @Get('type/:typeId')
  @ApiOperation({ summary: 'Get account categories by type for the group' })
  @ApiResponse({ status: 200, description: 'List of categories by type' })
  async findByType(@Param('typeId') typeId: string, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.accountCategoryService.findAllByType(groupId, typeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account category by ID' })
  @ApiResponse({ status: 200, description: 'Account category details' })
  async findOne(@Param('id') id: string) {
    return this.accountCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account category' })
  @ApiBody({ type: UpdateAccountCategoryDto })
  @ApiResponse({ status: 200, description: 'Account category updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountCategoryDto,
    @Req() req: Request,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.accountCategoryService.update(id, dto, groupId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account category' })
  @ApiResponse({ status: 200, description: 'Account category deleted' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.accountCategoryService.delete(id, groupId);
  }
}
