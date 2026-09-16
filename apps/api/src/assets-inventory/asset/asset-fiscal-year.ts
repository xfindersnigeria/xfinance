import { PrismaService } from '@/prisma/prisma.service';
import { FiscalYear, YearEnd, fiscalYearFor, parseYearEnd } from './depreciation.util';

export interface EntityFiscalYear extends FiscalYear {
  yearEnd: YearEnd;
}

/** Current fiscal year for an entity, from its configured `yearEnd` setting. */
export async function getEntityFiscalYear(
  prisma: PrismaService,
  entityId: string,
  today: Date = new Date(),
): Promise<EntityFiscalYear> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { yearEnd: true },
  });
  const yearEnd = parseYearEnd(entity?.yearEnd);
  return { ...fiscalYearFor(today, yearEnd), yearEnd };
}
