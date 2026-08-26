ALTER TABLE "users" ADD COLUMN "notifyDailyDigest"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyDigestTasks"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyDigestCalendar"   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyDigestBudget"     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyDigestFinancials" BOOLEAN NOT NULL DEFAULT true;
