-- Add SEO / favicon fields to GroupCustomization
ALTER TABLE "GroupCustomization" ADD COLUMN "siteName"        TEXT;
ALTER TABLE "GroupCustomization" ADD COLUMN "faviconPublicId" TEXT;
ALTER TABLE "GroupCustomization" ADD COLUMN "faviconUrl"      TEXT;
