import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { UpdateEntityConfigDto } from './dto/organization';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('organization')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  /**
   * GET: Retrieve entity configuration
   */
  @Get('entity-config/:entityId')
  async getEntityConfiguration(@Param('entityId') entityId: string) {
    return this.organizationService.getEntityConfiguration(entityId);
  }

  /**
   * PUT: Update entity configuration
   */
  @Put('entity-config')
  @UseGuards(AuthGuard)
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
        address: { type: 'string' },
        city: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phoneNumber: { type: 'string' },
        logo: { type: 'string', format: 'binary' },
      },
    },
  })
  async updateEntityConfiguration(
    @Body() body: UpdateEntityConfigDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new UnauthorizedException('Access denied!');
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied!');

    return this.organizationService.updateEntityConfiguration(
      entityId,
      body,
      file,
      groupId,
    );
  }
}
