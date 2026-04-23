import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { EntityService } from './entity.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { GetEntitiesQueryDto } from './dto/get-entities-query.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { systemRole } from 'prisma/generated/enums';
import { Request } from 'express';
import { getEffectiveGroupId } from '../auth/utils/context.util';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Entities')
@UseGuards(AuthGuard)
// @ApiBearerAuth('jwt')
// @ApiCookieAuth('cookieAuth')
@Controller('entities')
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({ summary: 'Create an entity' })
  @ApiResponse({ status: 201, description: 'Entity created' })
  create(@Body() body: any,     @UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    console.log('Received request to create entity with data:', body);

  const createEntityDto = {
    name: body.name,
    legalName: body.legalName,
    taxId: body.taxId,
    country: body.country,
    currency: body.currency,
    yearEnd: body.yearEnd,
    address: body.address,
    city: body.city,
    state: body.state,
    postalCode: body.postalCode,
    phoneNumber: body.phoneNumber,
    email: body.email,
    website: body.website,
  };
  
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('No effective group ID found.');
    }
    return this.entityService.create(createEntityDto, effectiveGroupId, file);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'List entities for the effective group' })
  @ApiResponse({ status: 200, description: 'List of entities' })
  findAll(@Query() query: GetEntitiesQueryDto, @Req() req: Request) {
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('No effective group ID found.');
    }
    return this.entityService.findAll(query, effectiveGroupId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by id' })
  @ApiResponse({ status: 200, description: 'Entity detail' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('No effective group ID found.');
    }
    return this.entityService.findOne(id, effectiveGroupId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Update an entity' })
  @ApiResponse({ status: 200, description: 'Entity updated' })
  update(
    @Param('id') id: string,
    @Body() updateEntityDto: UpdateEntityDto,
    @Req() req: Request,
  ) {
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('No effective group ID found.');
    }
    return this.entityService.update(id, updateEntityDto, effectiveGroupId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(systemRole.admin, systemRole.superadmin)
  @ApiOperation({ summary: 'Delete an entity' })
  @ApiResponse({ status: 200, description: 'Entity removed' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('No effective group ID found.');
    }
    return this.entityService.remove(id, effectiveGroupId);
  }
}
