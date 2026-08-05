-- DropForeignKey
ALTER TABLE "ReceiptItem" DROP CONSTRAINT "ReceiptItem_itemId_fkey";

-- AlterTable: itemId becomes optional, add free-text itemName
ALTER TABLE "ReceiptItem" ALTER COLUMN "itemId" DROP NOT NULL;
ALTER TABLE "ReceiptItem" ADD COLUMN "itemName" TEXT;

-- AddForeignKey (SET NULL instead of RESTRICT, so a free-text line item's
-- record isn't blocked, and deleting an Items record no longer blocks
-- deletion — itemName preserves the label on existing receipt lines)
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
