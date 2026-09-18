-- The service store-item form saved its price x100 (as if in kobo) into
-- "rate" and never set "sellingPrice", while every other amount in the app is
-- stored in whole currency units — so service prices showed blank on the
-- store-items list and would have sold at 100x on the POS. Normalise them.
UPDATE "StoreItems"
SET "rate" = ROUND("rate" / 100.0),
    "sellingPrice" = ROUND("rate" / 100.0)
WHERE "type" = 'service' AND "sellingPrice" IS NULL AND "rate" IS NOT NULL;
