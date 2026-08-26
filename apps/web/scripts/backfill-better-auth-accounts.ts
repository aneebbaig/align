/**
 * One-off migration: give every existing user a better-auth credential
 * `account` row whose password is their existing bcrypt `hashedPassword`.
 * lib/auth.ts is configured with bcryptjs verify, so these keep working.
 * Idempotent — skips users that already have a credential account.
 * Run once against each environment before the auth cutover:
 *   npx tsx scripts/backfill-better-auth-accounts.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, hashedPassword: true } });
  let created = 0;
  for (const u of users) {
    const existing = await prisma.account.findFirst({
      where: { userId: u.id, providerId: "credential" },
    });
    if (existing) continue;
    await prisma.account.create({
      data: {
        id: `cred_${u.id}`,
        accountId: u.id,
        providerId: "credential",
        userId: u.id,
        password: u.hashedPassword,
      },
    });
    created++;
    console.log(`+ credential account for ${u.email}`);
  }
  console.log(`Done. Created ${created} credential account(s) for ${users.length} user(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
