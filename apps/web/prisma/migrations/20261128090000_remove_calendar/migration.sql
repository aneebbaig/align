-- Calendar is removed. Drop its table and digest preference, and clear the hidden-section key.
DROP TABLE IF EXISTS "calendar_events";

ALTER TABLE "users" DROP COLUMN IF EXISTS "notifyDigestCalendar";

UPDATE "users" SET "hiddenSections" = array_remove("hiddenSections", 'calendar');
