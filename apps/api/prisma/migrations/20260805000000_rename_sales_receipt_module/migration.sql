-- Data migration: rename the "Sales Receipt" module display name to "Income Receipt".
-- moduleKey stays "salesReceipt" (routes/permissions unaffected) — UI label only.
UPDATE "Module"
SET "displayName" = 'Income Receipt'
WHERE "moduleKey" = 'salesReceipt' AND "displayName" = 'Sales Receipt';
