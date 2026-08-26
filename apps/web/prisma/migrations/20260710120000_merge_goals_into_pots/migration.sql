-- Merge Savings Goals into Savings Pots, and retire the WEDDING planner type.
-- A pot with a target IS a savings goal, so goals become GOAL-type pots. A
-- goal's saved amount is materialised as a real base-currency balance (the user
-- chose to preserve progress as real money in the pot).

-- 1. Pots gain an optional deadline (from the goal).
ALTER TABLE "savings_pots" ADD COLUMN "targetDate" TIMESTAMP(3);

-- 2. Weddings use the dedicated Wedding feature now; retype any leftover ones.
UPDATE "planners" SET "type" = 'GENERAL' WHERE "type" = 'WEDDING';

-- 3. A goal already linked to a pot is absorbed into that pot (copy target/deadline).
UPDATE "savings_pots" p
SET "targetAmount" = g."targetAmount", "targetDate" = g."deadline"
FROM "goals" g
WHERE p."linkedGoalId" = g."id";

-- 4. Every other goal becomes a new GOAL-type pot. Deterministic id (gpot_<goalId>)
--    so the balance/entry inserts below can join back to the source goal.
INSERT INTO "savings_pots" ("id","name","icon","color","targetAmount","targetDate","type","userId","createdAt","updatedAt")
SELECT 'gpot_' || g."id", g."name", g."icon", g."color", g."targetAmount", g."deadline", 'GOAL', g."userId", now(), now()
FROM "goals" g
WHERE g."id" NOT IN (SELECT "linkedGoalId" FROM "savings_pots" WHERE "linkedGoalId" IS NOT NULL);

-- 5. Seed the migrated goal's saved amount as a base-currency balance on the new pot.
INSERT INTO "savings_pot_balances" ("id","potId","currencyId","amount")
SELECT gen_random_uuid()::text, 'gpot_' || g."id", (SELECT "id" FROM "currencies" WHERE "isBase" LIMIT 1), g."savedAmount"
FROM "goals" g
WHERE g."savedAmount" > 0
  AND g."id" NOT IN (SELECT "linkedGoalId" FROM "savings_pots" WHERE "linkedGoalId" IS NOT NULL)
  AND EXISTS (SELECT 1 FROM "currencies" WHERE "isBase");

-- 6. Record that balance in the pot's ledger for traceability.
INSERT INTO "savings_pot_entries" ("id","potId","amount","currencyId","sourceType","description","createdAt")
SELECT gen_random_uuid()::text, 'gpot_' || g."id", g."savedAmount", (SELECT "id" FROM "currencies" WHERE "isBase" LIMIT 1), 'MANUAL', 'Migrated from savings goal', now()
FROM "goals" g
WHERE g."savedAmount" > 0
  AND g."id" NOT IN (SELECT "linkedGoalId" FROM "savings_pots" WHERE "linkedGoalId" IS NOT NULL)
  AND EXISTS (SELECT 1 FROM "currencies" WHERE "isBase");

-- 7. Drop the goal link and the goals table.
ALTER TABLE "savings_pots" DROP CONSTRAINT IF EXISTS "savings_pots_linkedGoalId_fkey";
ALTER TABLE "savings_pots" DROP COLUMN "linkedGoalId";
DROP TABLE "goals";
