-- Make accountId nullable in GroupBudget (old records keep their value)
ALTER TABLE "GroupBudget" ALTER COLUMN "accountId" DROP NOT NULL;

-- Make accountId nullable in Forecast
ALTER TABLE "Forecast" ALTER COLUMN "accountId" DROP NOT NULL;

-- Add subCategoryId to GroupBudget
ALTER TABLE "GroupBudget" ADD COLUMN "subCategoryId" TEXT;

-- Add subCategoryId to Forecast
ALTER TABLE "Forecast" ADD COLUMN "subCategoryId" TEXT;

-- Add FK constraints
ALTER TABLE "GroupBudget" ADD CONSTRAINT "GroupBudget_subCategoryId_fkey"
  FOREIGN KEY ("subCategoryId") REFERENCES "AccountSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_subCategoryId_fkey"
  FOREIGN KEY ("subCategoryId") REFERENCES "AccountSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "GroupBudget_subCategoryId_idx" ON "GroupBudget"("subCategoryId");
CREATE INDEX "Forecast_subCategoryId_idx" ON "Forecast"("subCategoryId");
