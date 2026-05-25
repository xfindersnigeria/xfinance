-- CreateTable GroupBudget
CREATE TABLE "GroupBudget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "note" TEXT,
    "accountId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable Forecast
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'Medium',
    "forecastMethod" TEXT NOT NULL DEFAULT 'manual',
    "growthRate" DOUBLE PRECISION,
    "note" TEXT,
    "accountId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupBudget_groupId_idx" ON "GroupBudget"("groupId");
CREATE INDEX "GroupBudget_accountId_idx" ON "GroupBudget"("accountId");
CREATE INDEX "Forecast_groupId_idx" ON "Forecast"("groupId");
CREATE INDEX "Forecast_accountId_idx" ON "Forecast"("accountId");

-- AddForeignKey
ALTER TABLE "GroupBudget" ADD CONSTRAINT "GroupBudget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
