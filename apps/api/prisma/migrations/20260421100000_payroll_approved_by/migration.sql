ALTER TABLE "PayrollBatch" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "PayrollBatch" ADD COLUMN "approvedAt"   TIMESTAMPTZ;

ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
