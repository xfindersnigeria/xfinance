-- Default sales tax rate can now hold decimals (e.g. 7.5% VAT)
ALTER TABLE "Settings" ALTER COLUMN "taxRate" SET DATA TYPE DOUBLE PRECISION;

-- Record the rate each invoice/receipt was taxed at
ALTER TABLE "Invoice" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Receipt" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: before this change tax was hardcoded at 10% whenever any line was taxable
UPDATE "Invoice" SET "taxRate" = 10 WHERE "tax" > 0;
UPDATE "Receipt" SET "taxRate" = 10 WHERE "tax" > 0;
