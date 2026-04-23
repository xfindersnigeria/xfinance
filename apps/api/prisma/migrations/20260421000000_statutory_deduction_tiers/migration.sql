-- Add fixedAmount and minAmount to StatutoryDeduction
ALTER TABLE "StatutoryDeduction" ADD COLUMN "fixedAmount" DOUBLE PRECISION;
ALTER TABLE "StatutoryDeduction" ADD COLUMN "minAmount" DOUBLE PRECISION;

-- Create TaxTier table for TIERED deductions
CREATE TABLE "TaxTier" (
  "id"                   TEXT NOT NULL,
  "statutoryDeductionId" TEXT NOT NULL,
  "from"                 DOUBLE PRECISION NOT NULL,
  "to"                   DOUBLE PRECISION,
  "rate"                 DOUBLE PRECISION NOT NULL,

  CONSTRAINT "TaxTier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaxTier_statutoryDeductionId_idx" ON "TaxTier"("statutoryDeductionId");

ALTER TABLE "TaxTier" ADD CONSTRAINT "TaxTier_statutoryDeductionId_fkey"
  FOREIGN KEY ("statutoryDeductionId") REFERENCES "StatutoryDeduction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
