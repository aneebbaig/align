-- Standalone planner: settings, lines (with steps and one-month overrides),
-- and one-off goals. Inputs only - the table is computed on read.

CREATE TABLE "planner_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startMonthKey" INTEGER NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 24,
    "startingCash" INTEGER NOT NULL DEFAULT 0,
    "usdRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planner_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planner_lines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planner_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planner_steps" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "monthKey" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "planner_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planner_overrides" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "monthKey" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "planner_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planner_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthKey" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planner_goals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planner_settings_userId_key" ON "planner_settings"("userId");
CREATE INDEX "planner_lines_userId_idx" ON "planner_lines"("userId");
CREATE UNIQUE INDEX "planner_steps_lineId_monthKey_key" ON "planner_steps"("lineId", "monthKey");
CREATE UNIQUE INDEX "planner_overrides_lineId_monthKey_key" ON "planner_overrides"("lineId", "monthKey");
CREATE INDEX "planner_goals_userId_idx" ON "planner_goals"("userId");

ALTER TABLE "planner_settings" ADD CONSTRAINT "planner_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_lines" ADD CONSTRAINT "planner_lines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_steps" ADD CONSTRAINT "planner_steps_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "planner_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_overrides" ADD CONSTRAINT "planner_overrides_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "planner_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_goals" ADD CONSTRAINT "planner_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
