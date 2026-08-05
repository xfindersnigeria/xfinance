-- Data migration: rename the "Sales Receipt" module key to "incomeReceipt".
-- Module is a global catalog row (one per moduleKey+scope, not per group),
-- and every permission/action/menu lookup joins to it by moduleId (FK), not
-- by this string — so this single UPDATE is safe and self-contained.
-- The route shown in the sidebar is generated at request time from
-- moduleKey via camelCase->kebab-case, so this alone flips the URL from
-- /income/sales-receipt to /income/income-receipt once combined with the
-- matching Next.js route folder rename.
UPDATE "Module"
SET "moduleKey" = 'incomeReceipt'
WHERE "moduleKey" = 'salesReceipt';
