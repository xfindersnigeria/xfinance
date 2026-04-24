-- AlterTable: add preference fields to Settings
ALTER TABLE "Settings"
  ADD COLUMN "language"           TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "timezone"           TEXT NOT NULL DEFAULT 'Africa/Lagos',
  ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "twoFactorAuth"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "auditLog"           BOOLEAN NOT NULL DEFAULT true;
