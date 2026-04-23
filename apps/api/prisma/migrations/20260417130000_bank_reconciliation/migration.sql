-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- AlterTable: add clearedInReconciliationId to AccountTransaction
ALTER TABLE "AccountTransaction" ADD COLUMN "clearedInReconciliationId" TEXT;

-- CreateTable: BankReconciliation
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "statementEndDate" TIMESTAMP(3) NOT NULL,
    "statementEndingBalance" DOUBLE PRECISION NOT NULL,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BankStatementTransaction
CREATE TABLE "BankStatementTransaction" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankStatementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BankReconciliationMatch
CREATE TABLE "BankReconciliationMatch" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "statementTransactionId" TEXT NOT NULL,
    "bookTransactionId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankReconciliation_entityId_idx" ON "BankReconciliation"("entityId");
CREATE INDEX "BankReconciliation_bankAccountId_idx" ON "BankReconciliation"("bankAccountId");
CREATE INDEX "BankReconciliation_groupId_idx" ON "BankReconciliation"("groupId");
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

CREATE INDEX "BankStatementTransaction_reconciliationId_idx" ON "BankStatementTransaction"("reconciliationId");
CREATE INDEX "BankStatementTransaction_entityId_idx" ON "BankStatementTransaction"("entityId");
CREATE INDEX "BankStatementTransaction_groupId_idx" ON "BankStatementTransaction"("groupId");

CREATE UNIQUE INDEX "BankReconciliationMatch_statementTransactionId_key" ON "BankReconciliationMatch"("statementTransactionId");
CREATE INDEX "BankReconciliationMatch_reconciliationId_idx" ON "BankReconciliationMatch"("reconciliationId");
CREATE INDEX "BankReconciliationMatch_bookTransactionId_idx" ON "BankReconciliationMatch"("bookTransactionId");
CREATE INDEX "BankReconciliationMatch_entityId_idx" ON "BankReconciliationMatch"("entityId");
CREATE INDEX "BankReconciliationMatch_groupId_idx" ON "BankReconciliationMatch"("groupId");

CREATE INDEX "AccountTransaction_clearedInReconciliationId_idx" ON "AccountTransaction"("clearedInReconciliationId");

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_statementTransactionId_fkey" FOREIGN KEY ("statementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
