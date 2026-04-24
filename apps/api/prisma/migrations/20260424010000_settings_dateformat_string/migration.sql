-- AlterTable: change dateFormat from DateTime to String
ALTER TABLE "Settings" ALTER COLUMN "dateFormat" TYPE TEXT USING "dateFormat"::TEXT;
