-- Wedding planner revamp: one list of expenses, each with a single estimated and
-- actual cost, an optional vendor, and any number of vendor quotes.
--
-- Data-preserving (expand, don't contract): the old columns and the
-- wedding_vendors table stay in place, unused, and every existing row is carried
-- across into the new shape. Nothing is dropped.

-- 1. New expense columns; the old per-source currency becomes optional --------
ALTER TABLE "wedding_expenses" ADD COLUMN     "estimatedAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wedding_expenses" ADD COLUMN     "actualAmount" INTEGER;
ALTER TABLE "wedding_expenses" ADD COLUMN     "paidAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wedding_expenses" ADD COLUMN     "vendorName" TEXT;
ALTER TABLE "wedding_expenses" ADD COLUMN     "vendorPhone" TEXT;
ALTER TABLE "wedding_expenses" ADD COLUMN     "vendorInstagram" TEXT;
ALTER TABLE "wedding_expenses" ALTER COLUMN "source1CurrencyId" DROP NOT NULL;

-- 2. Quotes -----------------------------------------------------------------
CREATE TABLE "wedding_quotes" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "phone" TEXT,
    "instagram" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isChosen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wedding_quotes_expenseId_idx" ON "wedding_quotes"("expenseId");

ALTER TABLE "wedding_quotes" ADD CONSTRAINT "wedding_quotes_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "wedding_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Existing expenses: fold both funding sources into one base-currency cost --
-- source amounts are in their currency's smallest unit; rateToBase converts to
-- the base currency (1 for the base itself). Payment is now its own number
-- (paidAmount): what was recorded as paid carries over, and an expense flagged
-- paid with no amount is taken to be paid in full (its estimate).
UPDATE "wedding_expenses" e SET
  "estimatedAmount" = ROUND(
      COALESCE(e."source1Amount", 0) * COALESCE((SELECT c."rateToBase" FROM "currencies" c WHERE c."id" = e."source1CurrencyId"), 1)
    + COALESCE(e."source2Amount", 0) * COALESCE((SELECT c."rateToBase" FROM "currencies" c WHERE c."id" = e."source2CurrencyId"), 1)
  )::INTEGER,
  "actualAmount" = CASE
    WHEN e."source1Paid" IS NULL AND e."source2Paid" IS NULL THEN NULL
    ELSE ROUND(
        COALESCE(e."source1Paid", 0) * COALESCE((SELECT c."rateToBase" FROM "currencies" c WHERE c."id" = e."source1CurrencyId"), 1)
      + COALESCE(e."source2Paid", 0) * COALESCE((SELECT c."rateToBase" FROM "currencies" c WHERE c."id" = e."source2CurrencyId"), 1)
    )::INTEGER
  END;

UPDATE "wedding_expenses" SET "actualAmount" = "estimatedAmount" WHERE "isPaid" AND "actualAmount" IS NULL;
UPDATE "wedding_expenses" SET "paidAmount" = COALESCE("actualAmount", 0);

-- 4. Existing vendors -> expenses (+ quotes) ------------------------------------
-- Vendors of the same event and category compete for the same job, so each such
-- group becomes ONE expense. A lone vendor sets the expense's vendor directly;
-- several vendors become quotes, the selected one chosen. Payment details are
-- kept: fully paid -> paid in full (actual cost = the amount); a deposit -> a
-- part payment (paidAmount).
CREATE TEMP TABLE "_wv" AS
SELECT
  v."id", v."weddingPlanId", v."eventId", v."name", v."phone", v."instagram", v."isSelected", v."paymentStatus", v."createdAt",
  v."category" AS "vcategory",
  COALESCE(v."finalAmount", v."quotedAmount") AS "amt",
  v."depositPaid" AS "deposit",
  NULLIF(concat_ws(E'\n',
    NULLIF(v."notes", ''),
    CASE WHEN v."paymentStatus" = 'CANCELLED' THEN 'Vendor cancelled' END
  ), '') AS "vnotes",
  count(*) OVER w AS "n",
  (ROW_NUMBER() OVER (w ORDER BY v."isSelected" DESC, v."createdAt", v."id") = 1
     AND (count(*) OVER w = 1 OR v."isSelected")) AS "chosen"
FROM "wedding_vendors" v
WINDOW w AS (PARTITION BY v."weddingPlanId", v."eventId", v."category");

CREATE TEMP TABLE "_wg" AS
SELECT
  gen_random_uuid()::TEXT AS "expense_id", d."weddingPlanId", d."eventId", d."vcategory",
  CASE d."vcategory"
    WHEN 'VENUE' THEN 'Venue' WHEN 'CATERING' THEN 'Catering' WHEN 'PHOTOGRAPHY' THEN 'Photography'
    WHEN 'VIDEOGRAPHY' THEN 'Videography' WHEN 'DECOR' THEN 'Décor & Flowers' WHEN 'MAKEUP' THEN 'Makeup artist'
    WHEN 'MEHNDI_ARTIST' THEN 'Mehndi artist' WHEN 'MUSIC_DJ' THEN 'Music & DJ' WHEN 'TRANSPORT' THEN 'Transport'
    WHEN 'OUTFITS_BRIDE' THEN 'Bride''s outfits' WHEN 'OUTFITS_GROOM' THEN 'Groom''s outfits' WHEN 'JEWELRY' THEN 'Jewelry'
    WHEN 'INVITATION' THEN 'Invitations' WHEN 'DHOLAK' THEN 'Dholak players' WHEN 'HORSE' THEN 'Horse / carriage'
    ELSE 'Vendor'
  END AS "label",
  CASE d."vcategory"
    WHEN 'OUTFITS_BRIDE' THEN 'DRESS' WHEN 'OUTFITS_GROOM' THEN 'DRESS' WHEN 'INVITATION' THEN 'PRINTING'
    WHEN 'DHOLAK' THEN 'ENTERTAINMENT' WHEN 'HORSE' THEN 'TRANSPORT' WHEN 'OTHER' THEN 'MISC'
    ELSE d."vcategory"
  END AS "ecategory"
FROM (SELECT DISTINCT "weddingPlanId", "eventId", "vcategory" FROM "_wv") d;

INSERT INTO "wedding_expenses" (
  "id", "weddingPlanId", "eventId", "name", "category", "estimatedAmount", "actualAmount",
  "vendorName", "vendorPhone", "vendorInstagram", "paidAmount", "notes", "createdAt", "source1Amount"
)
SELECT
  g."expense_id", g."weddingPlanId", g."eventId", g."label", g."ecategory",
  COALESCE(c."amt", a."min_active", a."min_all", 0),
  CASE WHEN c."paymentStatus" = 'FULLY_PAID' THEN c."amt" END,
  c."name", c."phone", c."instagram",
  CASE WHEN c."paymentStatus" = 'FULLY_PAID' THEN COALESCE(c."amt", 0) ELSE COALESCE(c."deposit", 0) END,
  CASE WHEN a."n" = 1 THEN c."vnotes" END,
  a."first_created",
  0
FROM "_wg" g
CROSS JOIN LATERAL (
  SELECT count(*) AS "n", min(w."amt") AS "min_all", min(w."createdAt") AS "first_created",
         min(w."amt") FILTER (WHERE w."paymentStatus" <> 'CANCELLED') AS "min_active"
  FROM "_wv" w
  WHERE w."weddingPlanId" = g."weddingPlanId" AND w."eventId" IS NOT DISTINCT FROM g."eventId" AND w."vcategory" = g."vcategory"
) a
LEFT JOIN "_wv" c
  ON c."chosen" AND c."weddingPlanId" = g."weddingPlanId" AND c."eventId" IS NOT DISTINCT FROM g."eventId" AND c."vcategory" = g."vcategory";

INSERT INTO "wedding_quotes" ("id", "expenseId", "vendorName", "phone", "instagram", "amount", "notes", "isChosen", "createdAt")
SELECT gen_random_uuid()::TEXT, g."expense_id", w."name", w."phone", w."instagram", w."amt",
  -- only the chosen quote is reflected in the expense's paidAmount; keep any other vendor's deposit visible
  NULLIF(concat_ws(E'\n', w."vnotes",
    CASE WHEN NOT w."chosen" AND COALESCE(w."deposit", 0) > 0 THEN 'Deposit paid: ' || ROUND(w."deposit" / 100.0, 2)::TEXT END
  ), ''),
  w."chosen", w."createdAt"
FROM "_wv" w
JOIN "_wg" g
  ON w."weddingPlanId" = g."weddingPlanId" AND w."eventId" IS NOT DISTINCT FROM g."eventId" AND w."vcategory" = g."vcategory"
WHERE w."n" > 1;

DROP TABLE "_wv";
DROP TABLE "_wg";
