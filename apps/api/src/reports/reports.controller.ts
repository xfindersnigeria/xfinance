import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { getEffectiveEntityId } from '@/auth/utils/context.util';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('profit-and-loss')
  @ApiOperation({ summary: 'Get Profit & Loss statement for a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-03-31' })
  @ApiQuery({ name: 'compareStartDate', required: false, example: '2024-10-01' })
  @ApiQuery({ name: 'compareEndDate', required: false, example: '2024-12-31' })
  async getProfitAndLoss(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const compareStart = compareStartDate ? new Date(compareStartDate) : undefined;
    const compareEnd = compareEndDate ? new Date(compareEndDate) : undefined;
    if (compareEnd) compareEnd.setHours(23, 59, 59, 999);

    const data = await this.reportsService.getProfitAndLoss(
      entityId,
      start,
      end,
      compareStart,
      compareEnd,
    );

    return { data, message: 'Profit & Loss report generated', statusCode: 200 };
  }

  @Get('cash-flow-statement')
  @ApiOperation({ summary: 'Get Cash Flow Statement for a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-03-31' })
  @ApiQuery({ name: 'compareStartDate', required: false, example: '2024-10-01' })
  @ApiQuery({ name: 'compareEndDate', required: false, example: '2024-12-31' })
  async getCashFlowStatement(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('compareStartDate') compareStartDate?: string,
    @Query('compareEndDate') compareEndDate?: string,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const compareStart = compareStartDate ? new Date(compareStartDate) : undefined;
    const compareEnd = compareEndDate ? new Date(compareEndDate) : undefined;
    if (compareEnd) compareEnd.setHours(23, 59, 59, 999);

    const data = await this.reportsService.getCashFlowStatement(
      entityId,
      start,
      end,
      compareStart,
      compareEnd,
    );

    return { data, message: 'Cash Flow Statement generated', statusCode: 200 };
  }
}
