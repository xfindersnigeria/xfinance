-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('POS', 'ONLINE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Pending', 'Completed', 'Cancelled');

-- DropForeignKey
ALTER TABLE "Bills" DROP CONSTRAINT "Bills_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_customerId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMade" DROP CONSTRAINT "PaymentMade_vendorId_fkey";

-- AlterTable
ALTER TABLE "Bills" ADD COLUMN     "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxName" TEXT,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vendorName" TEXT,
ALTER COLUMN "vendorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "onlineStoreEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storeSlug" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxName" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PaymentMade" ALTER COLUMN "vendorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxName" TEXT;

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "costPrice" INTEGER,
ADD COLUMN     "storeItemId" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "compoundTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reverseChargeVat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "taxCalculation" SET DEFAULT true;

-- AlterTable
ALTER TABLE "StoreItems" ADD COLUMN     "image" JSONB;

-- CreateTable
CREATE TABLE "TaxJurisdiction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jurisdictionId" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroupRate" (
    "id" TEXT NOT NULL,
    "taxGroupId" TEXT NOT NULL,
    "taxRateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "TaxGroupRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxExemption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxExemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpEncryption" TEXT NOT NULL DEFAULT 'tls',
    "smtpUsername" TEXT,
    "smtpPassword" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "invoiceEmails" BOOLEAN NOT NULL DEFAULT false,
    "paymentConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "receiptEmails" BOOLEAN NOT NULL DEFAULT false,
    "monthlyStatements" BOOLEAN NOT NULL DEFAULT false,
    "reminderSchedule" TEXT NOT NULL DEFAULT '3,7,14',
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReminderLog" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerStatementLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerStatementLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'Pending',
    "customerId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxName" TEXT,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod",
    "receiptId" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeItemId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxJurisdiction_entityId_idx" ON "TaxJurisdiction"("entityId");

-- CreateIndex
CREATE INDEX "TaxJurisdiction_groupId_idx" ON "TaxJurisdiction"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxJurisdiction_entityId_name_key" ON "TaxJurisdiction"("entityId", "name");

-- CreateIndex
CREATE INDEX "TaxRate_entityId_idx" ON "TaxRate"("entityId");

-- CreateIndex
CREATE INDEX "TaxRate_groupId_idx" ON "TaxRate"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_entityId_name_key" ON "TaxRate"("entityId", "name");

-- CreateIndex
CREATE INDEX "TaxGroup_entityId_idx" ON "TaxGroup"("entityId");

-- CreateIndex
CREATE INDEX "TaxGroup_groupId_idx" ON "TaxGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroup_entityId_name_key" ON "TaxGroup"("entityId", "name");

-- CreateIndex
CREATE INDEX "TaxGroupRate_taxRateId_idx" ON "TaxGroupRate"("taxRateId");

-- CreateIndex
CREATE INDEX "TaxGroupRate_groupId_idx" ON "TaxGroupRate"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroupRate_taxGroupId_taxRateId_key" ON "TaxGroupRate"("taxGroupId", "taxRateId");

-- CreateIndex
CREATE INDEX "TaxExemption_entityId_idx" ON "TaxExemption"("entityId");

-- CreateIndex
CREATE INDEX "TaxExemption_groupId_idx" ON "TaxExemption"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxExemption_entityId_code_key" ON "TaxExemption"("entityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_entityId_key" ON "EmailSettings"("entityId");

-- CreateIndex
CREATE INDEX "EmailSettings_groupId_idx" ON "EmailSettings"("groupId");

-- CreateIndex
CREATE INDEX "EmailTemplate_groupId_idx" ON "EmailTemplate"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_entityId_type_key" ON "EmailTemplate"("entityId", "type");

-- CreateIndex
CREATE INDEX "InvoiceReminderLog_groupId_idx" ON "InvoiceReminderLog"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminderLog_invoiceId_kind_days_key" ON "InvoiceReminderLog"("invoiceId", "kind", "days");

-- CreateIndex
CREATE INDEX "CustomerStatementLog_entityId_idx" ON "CustomerStatementLog"("entityId");

-- CreateIndex
CREATE INDEX "CustomerStatementLog_groupId_idx" ON "CustomerStatementLog"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerStatementLog_customerId_period_key" ON "CustomerStatementLog"("customerId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Order_receiptId_key" ON "Order"("receiptId");

-- CreateIndex
CREATE INDEX "Order_entityId_createdAt_idx" ON "Order"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_groupId_idx" ON "Order"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_entityId_orderNumber_key" ON "Order"("entityId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_storeItemId_idx" ON "OrderItem"("storeItemId");

-- CreateIndex
CREATE INDEX "OrderItem_groupId_idx" ON "OrderItem"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_storeSlug_key" ON "Entity"("storeSlug");

-- CreateIndex
CREATE INDEX "ReceiptItem_storeItemId_idx" ON "ReceiptItem"("storeItemId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMade" ADD CONSTRAINT "PaymentMade_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxJurisdiction" ADD CONSTRAINT "TaxJurisdiction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroup" ADD CONSTRAINT "TaxGroup_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroupRate" ADD CONSTRAINT "TaxGroupRate_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroupRate" ADD CONSTRAINT "TaxGroupRate_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxExemption" ADD CONSTRAINT "TaxExemption_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSettings" ADD CONSTRAINT "EmailSettings_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderLog" ADD CONSTRAINT "InvoiceReminderLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerStatementLog" ADD CONSTRAINT "CustomerStatementLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItems"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Backfills ────────────────────────────────────────────────────────────────

-- Settings.taxCalculation was never read before; the Tax settings switch now
-- controls whether new documents get the default tax, so keep existing
-- entities taxing exactly as they do today.
UPDATE "Settings" SET "taxCalculation" = true;

-- Bills stored only a tax amount; record the equivalent rate so edits
-- recompute the same amount.
UPDATE "Bills"
SET "taxRate" = ROUND(("tax"::numeric * 100) / ("subtotal" - "discount"), 4)
WHERE "tax" > 0 AND ("subtotal" - "discount") > 0;
