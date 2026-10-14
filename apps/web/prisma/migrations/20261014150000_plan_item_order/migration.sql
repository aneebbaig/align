-- Plan items become manually orderable. Existing items keep their current
-- on-screen order (group, then due date) as their starting order.

ALTER TABLE "plan_items" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

UPDATE "plan_items" p
SET "order" = r.rn
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "planId" ORDER BY "eventGroup" ASC, "dueDate" ASC, "id" ASC) AS rn
    FROM "plan_items"
) r
WHERE p."id" = r."id";
