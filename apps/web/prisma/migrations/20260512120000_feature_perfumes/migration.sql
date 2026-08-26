-- CreateTable
CREATE TABLE IF NOT EXISTS "perfumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "isLiked" BOOLEAN NOT NULL DEFAULT false,
    "buyNext" BOOLEAN NOT NULL DEFAULT false,
    "isSummer" BOOLEAN NOT NULL DEFAULT false,
    "occasion" TEXT,
    "notes" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfumes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "perfumes" ADD CONSTRAINT "perfumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "perfumes_userId_idx" ON "perfumes"("userId");
