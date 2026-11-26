-- Every wedding expense now belongs to an event. Expenses that were "whole wedding"
-- (eventId NULL) move into a new "Other" event per plan, which inherits whatever part
-- of the old total budget the plan's events had not already claimed.
INSERT INTO "wedding_events" ("id", "weddingPlanId", "type", "name", "budgetAllocated", "order")
SELECT
  'wev_' || md5(random()::text || p."id"),
  p."id",
  'OTHER',
  'Other',
  GREATEST(p."totalBudget" - COALESCE((SELECT SUM(e."budgetAllocated") FROM "wedding_events" e WHERE e."weddingPlanId" = p."id"), 0), 0),
  COALESCE((SELECT MAX(e."order") FROM "wedding_events" e WHERE e."weddingPlanId" = p."id"), 0) + 1
FROM "wedding_plans" p
WHERE EXISTS (SELECT 1 FROM "wedding_expenses" x WHERE x."weddingPlanId" = p."id" AND x."eventId" IS NULL);

UPDATE "wedding_expenses" x
SET "eventId" = (
  SELECT e."id" FROM "wedding_events" e
  WHERE e."weddingPlanId" = x."weddingPlanId" AND e."name" = 'Other' AND e."id" LIKE 'wev\_%'
  ORDER BY e."order" DESC LIMIT 1
)
WHERE x."eventId" IS NULL;

ALTER TABLE "wedding_expenses" DROP CONSTRAINT "wedding_expenses_eventId_fkey";
ALTER TABLE "wedding_expenses" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_events"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- NO ACTION (not RESTRICT): deleting a whole wedding cascades to its events and expenses, and RESTRICT
-- could fire before the expenses are gone. The app moves or deletes expenses before deleting an event.
