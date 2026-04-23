import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GetGroupsQueryDto } from './dto/get-groups-query.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { systemRole } from 'prisma/generated/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Groups')
@UseGuards(AuthGuard)
@ApiBearerAuth('jwt')
@ApiCookieAuth('cookieAuth')
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @UseGuards(RolesGuard) 
  @Roles(systemRole.superadmin)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({ summary: 'Create a new group with optional logo' })
  @ApiResponse({ status: 201, description: 'Group created' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        legalName: { type: 'string' },
        taxId: { type: 'string' },
        industry: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        province: { type: 'string' },
        postalCode: { type: 'string' },
        country: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        website: { type: 'string', format: 'uri' },
        subscriptionId: { type: 'string' },
        logo: { type: 'string', format: 'binary' },
      },
      required: [
        'name',
        'legalName',
        'taxId',
        'industry',
        'address',
        'city',
        'province',
        'postalCode',
        'country',
        'email',
        'phone',
      ],
    },
  })
  create(
    @Body() createGroupDto: CreateGroupDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.groupService.create(createGroupDto, file);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(systemRole.superadmin)
  @ApiOperation({ summary: 'List groups with pagination and search filters' })
  @ApiResponse({
    status: 200,
    description: 'List of groups with pagination metadata',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  })
  findAll(@Query() query: GetGroupsQueryDto) {
    console.log('Received query params:', query);
    return this.groupService.findAll(query);
  }

  @Get('stats/platform')
  @UseGuards(RolesGuard)
  @Roles(systemRole.superadmin)
  @ApiOperation({ summary: 'Get platform-wide group statistics' })
  @ApiResponse({ status: 200, description: 'Platform group statistics' })
  getPlatformStats() {
    return this.groupService.getSuperadminGroupStats();
  }

 

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Get group by id' })
  @ApiResponse({ status: 200, description: 'Group detail' })
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(systemRole.admin, systemRole.superadmin)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({ summary: 'Update group with optional new logo' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.groupService.update(id, updateGroupDto, file);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(systemRole.superadmin)
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({ status: 200, description: 'Group removed' })
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }
}
