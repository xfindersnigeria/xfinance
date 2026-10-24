import { ExpensesService } from '../purchases/expenses/expenses.service';
import { ReceiptService } from '../sales/receipt/receipt.service';
import { importRowId, parseImportDate } from './bulk-import.util';

describe('bulk-import util', () => {
  it('parses ISO dates and rejects garbage', () => {
    expect(parseImportDate('2025-11-24')).toBeInstanceOf(Date);
    expect(parseImportDate('24 Nov 2025')).toBeNull();
    expect(parseImportDate('2025-13-45')).toBeNull();
    expect(parseImportDate(undefined)).toBeNull();
  });
  it('row ids are deterministic per import + row', () => {
    expect(importRowId('bexp', 'abc', '5')).toBe(importRowId('bexp', 'abc', '5'));
    expect(importRowId('bexp', 'abc', '5')).not.toBe(importRowId('bexp', 'abd', '5'));
  });
});

function makeExpenses(existingIds: string[] = []) {
  const created: any[] = [];
  const prisma: any = {
    account: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pay', entityId: 'e1' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'exp1' }]),
    },
    expenses: {
      findMany: jest.fn().mockImplementation(async ({ where }) =>
        where.id.in.filter((i: string) => existingIds.includes(i)).map((id: string) => ({ id })),
      ),
      createMany: jest.fn().mockImplementation(async ({ data }) => created.push(...data)),
    },
  };
  const bull: any = { addBulkJobs: jest.fn() };
  const cache: any = { invalidateEntityDashboardCache: jest.fn() };
  const svc = new ExpensesService(prisma, {} as any, bull, cache);
  return { svc, prisma, bull, created };
}

const good = (key: string) => ({ key, date: '2025-11-24', description: 'Rent', amount: 1000, expenseAccountId: 'exp1' });

describe('bulkImportExpenses', () => {
  it('imports valid rows and reports bad rows without aborting the batch', async () => {
    const { svc, created, bull } = makeExpenses();
    const res = await svc.bulkImportExpenses(
      {
        paymentAccountId: 'pay',
        importId: 'imp1',
        items: [
          good('2'),
          { ...good('3'), date: 'garbage' },
          { ...good('4'), amount: 0 },
          { ...good('5'), expenseAccountId: 'nope' },
          good('6'),
        ],
      } as any,
      'e1',
      'g1',
    );
    expect(res.imported).toBe(2);
    expect(res.failed.map((f) => f.row).sort()).toEqual(['3', '4', '5']);
    expect(created).toHaveLength(2);
    expect(bull.addBulkJobs.mock.calls[0][0]).toHaveLength(2);
  });

  it('is idempotent: re-sending the same import creates and posts nothing twice', async () => {
    const first = importRowId('bexp', 'imp1', '2');
    const { svc, created, bull } = makeExpenses([first]);
    const res = await svc.bulkImportExpenses(
      { paymentAccountId: 'pay', importId: 'imp1', items: [good('2'), good('3')] } as any,
      'e1',
      'g1',
    );
    expect(res.alreadyImported).toBe(1);
    expect(res.imported).toBe(1);
    expect(created.map((c) => c.id)).toEqual([importRowId('bexp', 'imp1', '3')]);
    expect(bull.addBulkJobs.mock.calls[0][0]).toHaveLength(1);
  });
});

describe('bulkImportReceipts', () => {
  it('creates receipts + lines together and reports bad rows', async () => {
    const tx: any[] = [];
    const prisma: any = {
      account: { findUnique: jest.fn().mockResolvedValue({ id: 'dep', entityId: 'e1' }) },
      receipt: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn().mockReturnValue('R') },
      receiptItem: { createMany: jest.fn().mockReturnValue('I') },
      $transaction: jest.fn().mockImplementation(async (ops) => tx.push(...ops)),
    };
    const bull: any = { addBulkJobs: jest.fn() };
    const svc = new ReceiptService(prisma, bull, { invalidateEntityDashboardCache: jest.fn() } as any, {} as any);
    const res = await svc.bulkImportReceipts(
      {
        depositTo: 'dep',
        importId: 'imp2',
        items: [
          { key: '2', date: '2025-11-24', description: 'Fee', amount: 500 },
          { key: '3', date: 'x', description: 'Fee', amount: 500 },
        ],
      } as any,
      'e1',
      'g1',
    );
    expect(res.imported).toBe(1);
    expect(res.failed).toEqual([{ row: '3', message: expect.stringContaining('Invalid date') }]);
    expect(tx).toEqual(['R', 'I']);
    expect(prisma.receiptItem.createMany.mock.calls[0][0].data[0].receiptId).toBe(importRowId('brct', 'imp2', '2'));
  });
});
