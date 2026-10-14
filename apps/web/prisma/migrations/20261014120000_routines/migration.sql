-- Routines: timed daily routines and the per-day completion record.

CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "date" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "routine_completions" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "routine_completions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "routines_userId_idx" ON "routines"("userId");
CREATE UNIQUE INDEX "routine_completions_routineId_date_key" ON "routine_completions"("routineId", "date");
CREATE INDEX "routine_completions_userId_date_idx" ON "routine_completions"("userId", "date");

ALTER TABLE "routines" ADD CONSTRAINT "routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_completions" ADD CONSTRAINT "routine_completions_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_completions" ADD CONSTRAINT "routine_completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
