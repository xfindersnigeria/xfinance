-- Add invoice bank details and notes fields to Settings
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankRoutingNumber" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankSwiftCode" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "invoiceNotes" TEXT;
