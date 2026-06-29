-- AlterTable Employee: add PAYE tax information fields
ALTER TABLE "Employee" ADD COLUMN "tin" TEXT;
ALTER TABLE "Employee" ADD COLUMN "fctTaxpayerId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "annualRent" INTEGER;

-- AlterTable PayrollRecord: add deduction breakdown snapshot
ALTER TABLE "PayrollRecord" ADD COLUMN "deductionBreakdown" JSONB;
