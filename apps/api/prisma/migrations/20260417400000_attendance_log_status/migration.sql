-- Add status field to AttendanceLog for Draft/Submitted tracking
ALTER TABLE "AttendanceLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Draft';
