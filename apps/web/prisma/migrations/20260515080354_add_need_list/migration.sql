-- CreateTable
CREATE TABLE "need_list_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "estimatedCost" INTEGER,
    "url" TEXT,
    "categoryHint" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "need_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "need_list_items_userId_idx" ON "need_list_items"("userId");

-- CreateIndex
CREATE INDEX "need_list_items_status_idx" ON "need_list_items"("status");

-- AddForeignKey
ALTER TABLE "need_list_items" ADD CONSTRAINT "need_list_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
