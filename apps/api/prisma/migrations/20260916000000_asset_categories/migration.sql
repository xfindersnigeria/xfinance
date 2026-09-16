-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_assignedId_fkey";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "openingAccumAsOf" TIMESTAMP(3),
ADD COLUMN     "openingAccumulatedDepreciation" INTEGER,
ALTER COLUMN "assignedId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depreciationRate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetCategory_groupId_idx" ON "AssetCategory"("groupId");

-- CreateIndex
CREATE INDEX "AssetCategory_entityId_idx" ON "AssetCategory"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_entityId_name_key" ON "AssetCategory"("entityId", "name");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedId_fkey" FOREIGN KEY ("assignedId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

