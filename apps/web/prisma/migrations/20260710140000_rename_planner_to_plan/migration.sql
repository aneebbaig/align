-- Rename Planner -> Plan (model + tables), add planType. All renames are
-- data-preserving (no drop/recreate).

ALTER TABLE "planners" RENAME TO "plans";
ALTER TABLE "plans" RENAME CONSTRAINT "planners_pkey" TO "plans_pkey";
ALTER TABLE "plans" RENAME CONSTRAINT "planners_userId_fkey" TO "plans_userId_fkey";
ALTER INDEX "planners_userId_idx" RENAME TO "plans_userId_idx";
ALTER TABLE "plans" ADD COLUMN "planType" TEXT NOT NULL DEFAULT 'ITEMIZED';

ALTER TABLE "planner_items" RENAME TO "plan_items";
ALTER TABLE "plan_items" RENAME COLUMN "plannerId" TO "planId";
ALTER TABLE "plan_items" RENAME CONSTRAINT "planner_items_pkey" TO "plan_items_pkey";
ALTER TABLE "plan_items" RENAME CONSTRAINT "planner_items_plannerId_fkey" TO "plan_items_planId_fkey";
ALTER INDEX "planner_items_plannerId_idx" RENAME TO "plan_items_planId_idx";

ALTER TABLE "transactions" RENAME COLUMN "plannerItemId" TO "planItemId";
ALTER TABLE "transactions" RENAME CONSTRAINT "transactions_plannerItemId_fkey" TO "transactions_planItemId_fkey";
ALTER INDEX "transactions_plannerItemId_idx" RENAME TO "transactions_planItemId_idx";

ALTER TABLE "calendar_events" RENAME COLUMN "linkedPlannerId" TO "linkedPlanId";
ALTER TABLE "calendar_events" RENAME CONSTRAINT "calendar_events_linkedPlannerId_fkey" TO "calendar_events_linkedPlanId_fkey";
