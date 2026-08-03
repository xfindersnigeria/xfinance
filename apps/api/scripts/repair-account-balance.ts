/**
 * Repair Account Balance Script
 *
 * Fixes accounts whose cached `Account.balance` (and the `runningBalance`
 * snapshots on its AccountTransaction rows) drifted out of sync with the
 * ledger — e.g. the pre-fix bank-account-opening-balance bug that wrote
 * `Account.balance` directly AND then posted a journal entry on top of it,
 * doubling the balance.
 *
 * The ledger (Journal, OpeningBalance, OpeningBalanceItem, and each
 * AccountTransaction's own debitAmount/creditAmount) is always treated as
 * the source of truth. This script never touches those — it only
 * recomputes the two DERIVED/CACHED fields (Account.balance and each
 * transaction's runningBalance) by replaying the transaction history in
 * chronological order.
 *
 * No BullMQ, no HTTP calls, no NestJS bootstrap — pure Prisma, safe to run
 * directly against a production database via `docker exec` or a one-off
 * node process pointed at DATABASE_URL.
 *
 * Usage (run from apps/api/):
 *   npx ts-node -r tsconfig-paths/register scripts/repair-account-balance.ts list-entities
 *   npx ts-node -r tsconfig-paths/register scripts/repair-account-balance.ts list-accounts --entity=<entityId>
 *   npx ts-node -r tsconfig-paths/register scripts/repair-account-balance.ts diagnose --account=<accountId>
 *   npx ts-node -r tsconfig-paths/register scripts/repair-account-balance.ts repair --account=<accountId> [--confirm]
 *
 * `repair` without --confirm only prints what WOULD change — nothing is
 * written until you pass --confirm.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function listEntities() {
  const entities = await prisma.entity.findMany({
    select: { id: true, name: true, groupId: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\nEntities (${entities.length}):`);
  for (const e of entities) {
    console.log(`  ${e.id}  ${e.name}  (groupId: ${e.groupId})`);
  }
}

async function listAccounts(entityId: string) {
  const accounts = await prisma.account.findMany({
    where: { entityId },
    select: {
      id: true,
      name: true,
      code: true,
      balance: true,
      linkedType: true,
    },
    orderBy: { code: 'asc' },
  });
  console.log(`\nAccounts for entity ${entityId} (${accounts.length}):`);
  for (const a of accounts) {
    console.log(
      `  ${a.id}  ${a.code}  ${a.name}  balance=${a.balance}${a.linkedType ? `  [${a.linkedType}]` : ''}`,
    );
  }
}

/** Recompute the correct balance-change sign for a debit/credit pair, per account type. */
function balanceChangeFor(
  typeName: string | undefined,
  debit: number,
  credit: number,
): number {
  if (typeName === 'Assets' || typeName === 'Expenses') {
    return debit - credit;
  }
  return credit - debit;
}

async function getAccountWithType(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      subCategory: { include: { category: { include: { type: true } } } },
    },
  });
  if (!account) {
    console.error(`✗ Account ${accountId} not found`);
    process.exit(1);
  }
  return account;
}

/** Replay every AccountTransaction for this account in chronological order and
 * compute what runningBalance and the final Account.balance SHOULD be. */
async function computeCorrectState(accountId: string) {
  const account = await getAccountWithType(accountId);
  const typeName = account.subCategory?.category?.type?.name;

  const transactions = await prisma.accountTransaction.findMany({
    where: { accountId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  let cumulative = 0;
  const corrected = transactions.map((t) => {
    cumulative += balanceChangeFor(typeName, t.debitAmount, t.creditAmount);
    return { transaction: t, correctRunningBalance: cumulative };
  });

  return { account, typeName, corrected, correctFinalBalance: cumulative };
}

async function diagnose(accountId: string) {
  const { account, typeName, corrected, correctFinalBalance } =
    await computeCorrectState(accountId);

  console.log(`\nAccount: ${account.name} (${account.code})  type=${typeName}`);
  console.log(`Current cached balance: ${account.balance}`);
  console.log(`Correct balance (from ledger): ${correctFinalBalance}`);
  console.log(
    account.balance === correctFinalBalance
      ? '✓ Balance already matches the ledger — nothing to repair.'
      : `✗ MISMATCH — off by ${account.balance - correctFinalBalance}`,
  );

  console.log(`\nTransaction-by-transaction (${corrected.length} total):`);
  for (const { transaction: t, correctRunningBalance } of corrected) {
    const mismatch = t.runningBalance !== correctRunningBalance;
    console.log(
      `  ${t.date.toISOString().slice(0, 10)}  ${t.type.padEnd(20)}  debit=${t.debitAmount} credit=${t.creditAmount}` +
        `  runningBalance: stored=${t.runningBalance} correct=${correctRunningBalance}` +
        (mismatch ? '  ← MISMATCH' : ''),
    );
  }
}

async function repair(accountId: string, confirm: boolean) {
  const { account, corrected, correctFinalBalance } =
    await computeCorrectState(accountId);

  const changes = corrected.filter(
    ({ transaction: t, correctRunningBalance }) =>
      t.runningBalance !== correctRunningBalance,
  );

  console.log(`\nAccount: ${account.name} (${account.code})`);
  console.log(`Account.balance: ${account.balance} → ${correctFinalBalance}`);
  console.log(`AccountTransaction rows needing a runningBalance fix: ${changes.length}`);
  for (const { transaction: t, correctRunningBalance } of changes) {
    console.log(
      `  ${t.id}  ${t.date.toISOString().slice(0, 10)}  runningBalance ${t.runningBalance} → ${correctRunningBalance}`,
    );
  }

  if (account.balance === correctFinalBalance && changes.length === 0) {
    console.log('\n✓ Nothing to repair — already consistent with the ledger.');
    return;
  }

  if (!confirm) {
    console.log(
      '\nDry run only — no changes written. Re-run with --confirm to apply.',
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const { transaction: t, correctRunningBalance } of changes) {
      await tx.accountTransaction.update({
        where: { id: t.id },
        data: { runningBalance: correctRunningBalance },
      });
    }
    await tx.account.update({
      where: { id: accountId },
      data: { balance: correctFinalBalance },
    });
  });

  console.log('\n✓ Repair applied.');
}

async function main() {
  const command = process.argv[2];
  switch (command) {
    case 'list-entities':
      await listEntities();
      break;
    case 'list-accounts': {
      const entityId = getArg('entity');
      if (!entityId) {
        console.error('Usage: list-accounts --entity=<entityId>');
        process.exit(1);
      }
      await listAccounts(entityId);
      break;
    }
    case 'diagnose': {
      const accountId = getArg('account');
      if (!accountId) {
        console.error('Usage: diagnose --account=<accountId>');
        process.exit(1);
      }
      await diagnose(accountId);
      break;
    }
    case 'repair': {
      const accountId = getArg('account');
      if (!accountId) {
        console.error('Usage: repair --account=<accountId> [--confirm]');
        process.exit(1);
      }
      await repair(accountId, hasFlag('confirm'));
      break;
    }
    default:
      console.error(
        'Usage: repair-account-balance.ts <list-entities|list-accounts|diagnose|repair> [--entity=...] [--account=...] [--confirm]',
      );
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
