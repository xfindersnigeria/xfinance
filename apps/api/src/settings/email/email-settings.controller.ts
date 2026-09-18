import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { EmailSettingsService } from './email-settings.service';
import {
  SaveEmailTemplateDto,
  TestSmtpDto,
  UpdateEmailAutomationDto,
  UpdateSignatureDto,
  UpdateSmtpDto,
} from './dto/email-settings.dto';

@ApiTags('Settings - Email')
@Controller('settings/email')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class EmailSettingsController {
  constructor(private service: EmailSettingsService) {}

  private ctx(req: any) {
    const entityId = getEffectiveEntityId(req);
    const groupId = getEffectiveGroupId(req);
    if (!entityId || !groupId) throw new UnauthorizedException('Access denied');
    return { entityId, groupId };
  }

  @Get()
  @ApiOperation({ summary: 'SMTP, automated email switches, signature and template list' })
  overview(@Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.getOverview(entityId, groupId);
  }

  @Put('smtp')
  @ApiOperation({ summary: "Save the entity's own SMTP server (password stored encrypted)" })
  updateSmtp(@Body() dto: UpdateSmtpDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.updateSmtp(entityId, groupId, dto);
  }

  @Delete('smtp')
  @ApiOperation({ summary: 'Remove custom SMTP — send through the platform mailer again' })
  removeSmtp(@Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.removeSmtp(entityId, groupId);
  }

  @Post('smtp/test')
  @ApiOperation({ summary: 'Send a test email through the given (or saved) SMTP settings' })
  testSmtp(@Body() dto: TestSmtpDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.testSmtp(entityId, groupId, dto);
  }

  @Patch('automation')
  @ApiOperation({ summary: 'Automated email switches + payment reminder schedule' })
  updateAutomation(@Body() dto: UpdateEmailAutomationDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.updateAutomation(entityId, groupId, dto);
  }

  @Patch('signature')
  updateSignature(@Body() dto: UpdateSignatureDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.updateSignature(entityId, groupId, dto);
  }

  @Get('templates/:type')
  getTemplate(@Param('type') type: string, @Req() req: any) {
    return this.service.getTemplate(this.ctx(req).entityId, type);
  }

  @Put('templates/:type')
  saveTemplate(@Param('type') type: string, @Body() dto: SaveEmailTemplateDto, @Req() req: any) {
    const { entityId, groupId } = this.ctx(req);
    return this.service.saveTemplate(entityId, groupId, type, dto);
  }

  @Delete('templates/:type')
  @ApiOperation({ summary: 'Reset a template to the default' })
  resetTemplate(@Param('type') type: string, @Req() req: any) {
    return this.service.resetTemplate(this.ctx(req).entityId, type);
  }

  @Post('templates/:type/preview')
  @ApiOperation({ summary: 'Render a template (unsaved subject/body) with sample data' })
  previewTemplate(@Param('type') type: string, @Body() dto: SaveEmailTemplateDto, @Req() req: any) {
    return this.service.previewTemplate(this.ctx(req).entityId, type, dto);
  }
}
