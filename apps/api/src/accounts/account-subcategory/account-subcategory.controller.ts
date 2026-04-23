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
import { AccountSubCategoryService } from './account-subcategory.service';
import {
  CreateAccountSubCategoryDto,
  UpdateAccountSubCategoryDto,
} from './dto/account-subcategory.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';

@ApiTags('Account SubCategory')
@Controller('account-subcategory')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class AccountSubCategoryController {
  constructor(private accountSubCategoryService: AccountSubCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account subcategory' })
  @ApiBody({ type: CreateAccountSubCategoryDto })
  @ApiResponse({ status: 201, description: 'Account subcategory created' })
  async create(@Body() dto: CreateAccountSubCategoryDto) {
    if (!dto.categoryId) {
      throw new BadRequestException('Category ID is required');
    }
    return this.accountSubCategoryService.create(dto);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get all subcategories for a category' })
  @ApiResponse({ status: 200, description: 'List of subcategories' })
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.accountSubCategoryService.findAllByCategory(categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account subcategory by ID' })
  @ApiResponse({ status: 200, description: 'Account subcategory details' })
  async findOne(@Param('id') id: string) {
    return this.accountSubCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account subcategory' })
  @ApiBody({ type: UpdateAccountSubCategoryDto })
  @ApiResponse({ status: 200, description: 'Account subcategory updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountSubCategoryDto,
  ) {
    return this.accountSubCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account subcategory' })
  @ApiResponse({ status: 200, description: 'Account subcategory deleted' })
  async delete(@Param('id') id: string) {
    return this.accountSubCategoryService.delete(id);
  }
}
