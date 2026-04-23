-- Fix String[] fields that had no @default([])
-- Without a DB-level default, Prisma receives NULL back after INSERT and throws
-- a "Null constraint violation (not available)" error even though the DB column
-- is nullable — because Prisma's own type system treats String[] as non-optional.

-- Entity.disabledModuleIds
ALTER TABLE "Entity" ALTER COLUMN "disabledModuleIds" SET DEFAULT '{}';
UPDATE "Entity" SET "disabledModuleIds" = '{}' WHERE "disabledModuleIds" IS NULL;

-- User.adminEntities
ALTER TABLE "User" ALTER COLUMN "adminEntities" SET DEFAULT '{}';
UPDATE "User" SET "adminEntities" = '{}' WHERE "adminEntities" IS NULL;

-- Expenses.tags
ALTER TABLE "Expenses" ALTER COLUMN "tags" SET DEFAULT '{}';
UPDATE "Expenses" SET "tags" = '{}' WHERE "tags" IS NULL;
