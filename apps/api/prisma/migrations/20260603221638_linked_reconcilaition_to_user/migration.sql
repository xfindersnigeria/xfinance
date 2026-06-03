-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
