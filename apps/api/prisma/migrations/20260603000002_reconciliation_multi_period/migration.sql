-- Add statementStartDate to BankReconciliation for multi-period support
ALTER TABLE "BankReconciliation" ADD COLUMN "statementStartDate" TIMESTAMP(3);
