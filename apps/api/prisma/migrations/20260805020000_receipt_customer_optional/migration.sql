-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_customerId_fkey";

-- AlterTable: customerId becomes optional, add free-text customerName
ALTER TABLE "Receipt" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "Receipt" ADD COLUMN "customerName" TEXT;

-- AddForeignKey (SET NULL instead of CASCADE, so deleting a Customer no
-- longer deletes their receipt history — customerName preserves the label)
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
