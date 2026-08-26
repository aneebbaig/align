-- Retire the legacy GOAL_LINKED pot type: a pot with a target IS a goal, so
-- there is a single "GOAL" type now. Keeps the type enum clean and non-redundant.
UPDATE "savings_pots" SET "type" = 'GOAL' WHERE "type" = 'GOAL_LINKED';
