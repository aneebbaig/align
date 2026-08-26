-- Remove Fitness & Gym feature (moved to dedicated mobile app)
-- Drop in FK-safe order; CASCADE guards against any residual constraints.

DROP TABLE IF EXISTS "workout_sets" CASCADE;
DROP TABLE IF EXISTS "workout_sessions" CASCADE;
DROP TABLE IF EXISTS "workout_template_exercises" CASCADE;
DROP TABLE IF EXISTS "workout_templates" CASCADE;
DROP TABLE IF EXISTS "weekly_meal_plans" CASCADE;
DROP TABLE IF EXISTS "recipe_ingredients" CASCADE;
DROP TABLE IF EXISTS "recipes" CASCADE;
DROP TABLE IF EXISTS "nutrition_profiles" CASCADE;
DROP TABLE IF EXISTS "body_metrics" CASCADE;
