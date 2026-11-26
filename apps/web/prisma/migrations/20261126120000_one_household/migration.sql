-- One database = one household.
--
-- Every login is an admin over the SAME data, scoped by a single household
-- owner id: the oldest user (src/lib/household.ts). This migration moves all
-- shared data that currently sits on other users onto that owner.
--
-- Data only: no schema change, nothing is deleted. Personal tables are
-- untouched (account, session, twoFactor, surprises, and the users table itself apart from the shared budget
-- period). Safe to re-run in effect: every UPDATE is guarded by
-- "userId" <> owner (or NOT EXISTS), so a second run changes nothing.

DO $$
DECLARE
  owner_id text;
  t text;
BEGIN
  SELECT "id" INTO owner_id FROM "users" ORDER BY "createdAt", "id" LIMIT 1;
  IF owner_id IS NULL THEN
    RETURN; -- no users: nothing to do
  END IF;

  -- Shared period: the owner's open budget period becomes the latest one any
  -- user had (year * 12 + month).
  UPDATE "users" o
  SET "currentBudgetMonth" = l."currentBudgetMonth",
      "currentBudgetYear"  = l."currentBudgetYear"
  FROM (
    SELECT "currentBudgetMonth", "currentBudgetYear"
    FROM "users"
    WHERE "currentBudgetMonth" IS NOT NULL AND "currentBudgetYear" IS NOT NULL
    ORDER BY "currentBudgetYear" * 12 + "currentBudgetMonth" DESC
    LIMIT 1
  ) l
  WHERE o."id" = owner_id
    AND (o."currentBudgetMonth" IS DISTINCT FROM l."currentBudgetMonth"
      OR o."currentBudgetYear"  IS DISTINCT FROM l."currentBudgetYear");

  -- Plain per-user tables: no per-user unique constraint, move everything.
  -- (categories.userId is nullable: NULL = shared default, left as is.)
  FOREACH t IN ARRAY ARRAY[
    'categories', 'transactions', 'budgets', 'plans', 'savings_pots',
    'investments', 'want_list_items', 'need_list_items', 'tasks',
    'calendar_events', 'perfumes', 'loans', 'wedding_plans', 'projects',
    'planner_lines', 'planner_goals', 'routines', 'routine_completions'
  ] LOOP
    EXECUTE format('UPDATE %I SET "userId" = $1 WHERE "userId" <> $1', t) USING owner_id;
  END LOOP;

  -- One-per-user tables ("userId" is UNIQUE): move a non-owner row only when
  -- the owner has none; otherwise it stays on its user, unused (not deleted).
  UPDATE "investment_plans" p SET "userId" = owner_id
  WHERE p."userId" <> owner_id
    AND NOT EXISTS (SELECT 1 FROM "investment_plans" x WHERE x."userId" = owner_id)
    AND p."id" = (SELECT "id" FROM "investment_plans" WHERE "userId" <> owner_id ORDER BY "createdAt", "id" LIMIT 1);

  UPDATE "planner_settings" p SET "userId" = owner_id
  WHERE p."userId" <> owner_id
    AND NOT EXISTS (SELECT 1 FROM "planner_settings" x WHERE x."userId" = owner_id)
    AND p."id" = (SELECT "id" FROM "planner_settings" WHERE "userId" <> owner_id ORDER BY "createdAt", "id" LIMIT 1);

  -- Tags are UNIQUE ("userId", "name"). First repoint project-task links of a
  -- non-owner tag to the owner's same-named tag where that link does not
  -- already exist; then move the tags whose name the owner lacks. A clashing
  -- duplicate tag (and any link that could not be repointed) stays in place.
  UPDATE "project_task_tags" l SET "tagId" = ot."id"
  FROM "tags" dup, "tags" ot
  WHERE l."tagId" = dup."id"
    AND dup."userId" <> owner_id
    AND ot."userId" = owner_id
    AND ot."name" = dup."name"
    AND NOT EXISTS (
      SELECT 1 FROM "project_task_tags" e
      WHERE e."taskId" = l."taskId" AND e."tagId" = ot."id"
    )
    -- if one task links several same-named non-owner tags, repoint only one
    AND dup."id" = (
      SELECT min(d2."id") FROM "tags" d2
      JOIN "project_task_tags" l2 ON l2."tagId" = d2."id"
      WHERE l2."taskId" = l."taskId" AND d2."userId" <> owner_id AND d2."name" = dup."name"
    );

  -- Two non-owner tags with the same name: move only one of them.
  UPDATE "tags" tg SET "userId" = owner_id
  WHERE tg."userId" <> owner_id
    AND NOT EXISTS (SELECT 1 FROM "tags" x WHERE x."userId" = owner_id AND x."name" = tg."name")
    AND tg."id" = (
      SELECT d."id" FROM "tags" d
      WHERE d."userId" <> owner_id AND d."name" = tg."name"
      ORDER BY d."createdAt", d."id" LIMIT 1
    );
END $$;
