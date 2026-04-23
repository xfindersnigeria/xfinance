-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('Draft', 'Pending', 'Approved', 'Rejected');

-- CreateTable: PayrollBatch
CREATE TABLE "PayrollBatch" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'Draft',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PayrollRecord
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statutoryDed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossPay" DOUBLE PRECISION NOT NULL,
    "netPay" DOUBLE PRECISION NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "PayrollBatch_entityId_idx" ON "PayrollBatch"("entityId");
CREATE INDEX "PayrollBatch_groupId_idx" ON "PayrollBatch"("groupId");
CREATE INDEX "PayrollBatch_status_idx" ON "PayrollBatch"("status");
CREATE INDEX "PayrollRecord_batchId_idx" ON "PayrollRecord"("batchId");
CREATE INDEX "PayrollRecord_employeeId_idx" ON "PayrollRecord"("employeeId");
CREATE INDEX "PayrollRecord_entityId_idx" ON "PayrollRecord"("entityId");
CREATE INDEX "PayrollRecord_groupId_idx" ON "PayrollRecord"("groupId");

-- ForeignKeys
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "PayrollBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
