import { AuthGuard } from '@/auth/guards/auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JournalService } from './journal.service';
import { CreateJournalDto, UpdateJournalDto } from './dto/journal.dto';
import { Journal } from 'prisma/generated/client';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';

@ApiTags('Journal')
@Controller('journal')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class JournalController {
  constructor(private journalsService: JournalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiBody({ type: CreateJournalDto })
  @ApiResponse({ status: 201, description: 'Journal created' })
  async create(@Req() req, @Body() createJournalDto: CreateJournalDto): Promise<Journal> {
    const groupId = getEffectiveGroupId(req) as string;
    const entityId = getEffectiveEntityId(req) as string;
    return this.journalsService.create({...createJournalDto, entityId, groupId});
  }

  @Get()
  @ApiOperation({ summary: 'Get all journals (optionally filtered by entity)' })
  @ApiResponse({ status: 200, description: 'List of journals' })
  async findAll(@Req() req: Request): Promise<Journal[]> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.journalsService.findAll(entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single journal by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Journal found' })
  @ApiResponse({ status: 404, description: 'Journal not found' })
  async findOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Journal> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.journalsService.findOne(id, entityId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a journal entry' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateJournalDto })
  @ApiResponse({ status: 200, description: 'Journal updated' })
  async update(
    @Param('id') id: string,
    @Body() updateJournalDto: UpdateJournalDto,
    @Req() req: Request,
  ): Promise<Journal> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.journalsService.update(id, updateJournalDto, entityId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a journal entry' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Journal deleted' })
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return await this.journalsService.remove(id, entityId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a draft journal (triggers posting)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Journal activated and posting queued' })
  async activateDraftJournal(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Journal> {
    const groupId = getEffectiveGroupId(req) as string;
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Access denied!');
    return this.journalsService.activateDraftJournal(id, entityId, groupId);
  }

  @Get('by-reference/:reference')
  @ApiOperation({ summary: 'Find journals by reference number' })
  @ApiParam({ name: 'reference', type: String })
  @ApiQuery({ name: 'entityId', required: false })
  async findByReference(
    @Param('reference') reference: string,
    @Query('entityId') entityId?: string,
  ): Promise<Journal[]> {
    return this.journalsService.findByReference(reference, entityId);
  }
}
