-- CreateTable
CREATE TABLE IF NOT EXISTS "wedding_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3),
    "totalBudget" INTEGER NOT NULL DEFAULT 0,
    "haqMehr" INTEGER,
    "haqMehrNote" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wedding_events" (
    "id" TEXT NOT NULL,
    "weddingPlanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "venue" TEXT,
    "guestCount" INTEGER,
    "budgetAllocated" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "responsibleParty" TEXT NOT NULL DEFAULT 'JOINT',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wedding_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wedding_vendors" (
    "id" TEXT NOT NULL,
    "weddingPlanId" TEXT NOT NULL,
    "eventType" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "instagram" TEXT,
    "quotedAmount" INTEGER NOT NULL DEFAULT 0,
    "finalAmount" INTEGER,
    "depositPaid" INTEGER,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wedding_plans_userId_idx" ON "wedding_plans"("userId");

-- CreateIndex
CREATE INDEX "wedding_events_weddingPlanId_idx" ON "wedding_events"("weddingPlanId");

-- CreateIndex
CREATE INDEX "wedding_vendors_weddingPlanId_idx" ON "wedding_vendors"("weddingPlanId");

-- AddForeignKey
ALTER TABLE "wedding_plans" ADD CONSTRAINT "wedding_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_events" ADD CONSTRAINT "wedding_events_weddingPlanId_fkey" FOREIGN KEY ("weddingPlanId") REFERENCES "wedding_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_vendors" ADD CONSTRAINT "wedding_vendors_weddingPlanId_fkey" FOREIGN KEY ("weddingPlanId") REFERENCES "wedding_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
