import { ApiProperty } from '@nestjs/swagger';
import { ExpenseDto } from './expense.dto';

export class GetExpensesResponseDto {
  @ApiProperty({ type: [ExpenseDto] })
  expenses: ExpenseDto[];

  @ApiProperty({ example: 100, description: 'Total expenses matching filter' })
  totalCount: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
