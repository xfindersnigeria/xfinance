import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { CustomizationService } from './customization.service';
import { UpdateCustomizationDto } from './dto/customization.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('settings/customization')
export class CustomizationController {
  constructor(private customizationService: CustomizationService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getCustomization(@Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    return this.customizationService.getCustomization(groupId);
  }

  @Patch()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'loginBg', maxCount: 1 },
    ]),
  )
  async updateCustomization(
    @Body() dto: UpdateCustomizationDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; loginBg?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new UnauthorizedException('Access denied');
    return this.customizationService.updateCustomization(
      groupId,
      dto,
      files?.logo?.[0],
      files?.loginBg?.[0],
    );
  }
}

@Controller('public/customization')
export class PublicCustomizationController {
  constructor(private customizationService: CustomizationService) {}

  /**
   * No auth guard — resolves group from the request host header.
   * Next.js server passes X-Forwarded-Host with the original browser host.
   */
  @Get()
  async getPublicCustomization(@Req() req: Request) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(':')[0];
    const groupId = await this.customizationService.resolveGroupFromHost(host);
    return this.customizationService.getPublicCustomization(groupId);
  }
}
