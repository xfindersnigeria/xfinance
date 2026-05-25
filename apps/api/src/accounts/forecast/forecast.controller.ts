import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { CreateBulkForecastDto } from './dto/forecast.dto';
import { getEffectiveGroupId } from '@/auth/utils/context.util';
import { Request } from 'express';
import { AuthGuard } from '@/auth/guards/auth.guard';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Forecast')
@Controller('forecast/group')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Post()
  @ApiOperation({ summary: 'Create or replace group forecast lines for a period' })
  async create(@Body() dto: CreateBulkForecastDto, @Req() req: Request) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.forecastService.createBulkForecasts(groupId, dto);
  }

  @Get('lines')
  @ApiOperation({ summary: 'Get forecast lines for a specific period' })
  @ApiQuery({ name: 'periodType', required: true })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: true })
  async getForecastLines(
    @Req() req: Request,
    @Query('periodType') periodType: string,
    @Query('period') period: string,
    @Query('fiscalYear') fiscalYear: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    if (!periodType || !fiscalYear)
      throw new BadRequestException('periodType and fiscalYear are required');
    return this.forecastService.getForecastLines(groupId, {
      periodType,
      period: period ?? '',
      fiscalYear,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List group forecasts' })
  @ApiQuery({ name: 'periodType', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Req() req: Request,
    @Query('periodType') periodType?: string,
    @Query('period') period?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    return this.forecastService.findAll(groupId, {
      periodType,
      period,
      fiscalYear,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Delete()
  @ApiOperation({ summary: 'Delete forecast lines for a period' })
  @ApiQuery({ name: 'periodType', required: true })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'fiscalYear', required: true })
  async delete(
    @Req() req: Request,
    @Query('periodType') periodType: string,
    @Query('period') period: string,
    @Query('fiscalYear') fiscalYear: string,
  ) {
    const groupId = getEffectiveGroupId(req);
    if (!groupId) throw new BadRequestException('Group ID is required');
    if (!periodType || !fiscalYear)
      throw new BadRequestException('periodType and fiscalYear are required');
    return this.forecastService.deleteForecast(groupId, {
      periodType,
      period: period ?? '',
      fiscalYear,
    });
  }
}
