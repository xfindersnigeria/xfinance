import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import {
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';
import {
  ApiParam,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

@ApiTags('Customers')
@Controller('sales/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a customer for the current entity' })
  @ApiCookieAuth('cookieAuth')
  @ApiBody({ type: CreateCustomerDto })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async createCustomer(@Body() body: CreateCustomerDto, @Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req) as string;
    return this.customerService.createCustomer(body, entityId, groupId);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all customers for the current entity' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Customers list with totals' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  async getCustomersByEntity(@Req() req) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.customerService.getAllCustomer(entityId);
  }

  @Get(':customerId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a customer by ID with their invoices' })
  @ApiParam({ name: 'customerId', description: 'Customer ID', type: 'string' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Customer with invoices' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access this customer',
  })
  async getCustomer(@Req() req, @Param('customerId') customerId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.customerService.getCustomerById(customerId, entityId);
  }

  @Patch(':customerId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID', type: 'string' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Customer updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this customer',
  })
  async updateCustomer(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() body: UpdateCustomerDto,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.customerService.updateCustomer(body, customerId, entityId);
  }

  @Delete(':customerId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a customer and their invoices' })
  @ApiParam({ name: 'customerId', description: 'Customer ID', type: 'string' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  @ApiOkResponse({ description: 'Customer deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to delete this customer',
  })
  async removeCustomer(@Req() req, @Param('customerId') customerId: string) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    return this.customerService.deleteCustomer(customerId, entityId);
  }
}
