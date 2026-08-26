-- Drop items column: MILESTONE task type removed, data migrated to Project/ProjectTask.
ALTER TABLE "tasks" DROP COLUMN "items";
