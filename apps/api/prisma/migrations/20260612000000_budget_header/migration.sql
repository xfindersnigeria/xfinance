-- CreateTable
CREATE TABLE "BudgetHeader" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "note" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBudgetHeader" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "note" TEXT,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBudgetHeader_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "budgetHeaderId" TEXT;

-- AlterTable
ALTER TABLE "GroupBudget" ADD COLUMN "groupBudgetHeaderId" TEXT;

-- CreateIndex
CREATE INDEX "BudgetHeader_entityId_idx" ON "BudgetHeader"("entityId");
CREATE INDEX "BudgetHeader_groupId_idx" ON "BudgetHeader"("groupId");
CREATE INDEX "GroupBudgetHeader_groupId_idx" ON "GroupBudgetHeader"("groupId");
CREATE INDEX "Budget_budgetHeaderId_idx" ON "Budget"("budgetHeaderId");
CREATE INDEX "GroupBudget_groupBudgetHeaderId_idx" ON "GroupBudget"("groupBudgetHeaderId");

-- AddForeignKey
ALTER TABLE "BudgetHeader" ADD CONSTRAINT "BudgetHeader_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_budgetHeaderId_fkey" FOREIGN KEY ("budgetHeaderId") REFERENCES "BudgetHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupBudget" ADD CONSTRAINT "GroupBudget_groupBudgetHeaderId_fkey" FOREIGN KEY ("groupBudgetHeaderId") REFERENCES "GroupBudgetHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
