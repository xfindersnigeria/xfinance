-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccountTransactionType" ADD VALUE 'PAYROLL_POSTING';
ALTER TYPE "AccountTransactionType" ADD VALUE 'PAYROLL_PAYMENT_POSTING';

-- AlterEnum
ALTER TYPE "PayrollStatus" ADD VALUE 'Paid';

-- AlterTable
ALTER TABLE "PayrollBatch" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "journalReference" TEXT,
ADD COLUMN     "netPayableAccountId" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending';

-- CreateTable
CREATE TABLE "PayrollPayment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT,
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollPayment_entityId_idx" ON "PayrollPayment"("entityId");

-- CreateIndex
CREATE INDEX "PayrollPayment_batchId_idx" ON "PayrollPayment"("batchId");

-- CreateIndex
CREATE INDEX "PayrollPayment_groupId_idx" ON "PayrollPayment"("groupId");

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayrollBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
