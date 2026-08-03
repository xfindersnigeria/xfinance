-- AlterEnum
ALTER TYPE "OpeningBalanceStatus" ADD VALUE 'Reversed';

-- DropIndex
DROP INDEX "OpeningBalance_entityId_fiscalYear_key";

-- AlterTable
ALTER TABLE "OpeningBalance" ADD COLUMN     "reversalOfId" TEXT,
ADD COLUMN     "reversalReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalance_reversalOfId_key" ON "OpeningBalance"("reversalOfId");

-- CreateIndex
CREATE INDEX "OpeningBalance_entityId_fiscalYear_idx" ON "OpeningBalance"("entityId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "OpeningBalance" ADD CONSTRAINT "OpeningBalance_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "OpeningBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
