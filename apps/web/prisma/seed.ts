import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { DEFAULT_CATEGORIES, defaultCategoryId } from "../src/lib/default-categories";

// PrismaNeon only works against a real Neon endpoint (WebSocket protocol) -
// use plain pg for local/Docker Postgres so this seed script works in both.
const dbUrl = process.env.DATABASE_URL ?? "";
const adapter = dbUrl.includes(".neon.tech")
  ? new PrismaNeon({ connectionString: dbUrl })
  : new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

// Passwords are NEVER hardcoded. If the env var is set we use it (min 8
// chars); otherwise we generate a strong random one and print it once, so a
// deploy can never end up with a public, guessable default credential.
const generatedCreds: string[] = [];

function resolvePassword(env: string | undefined, email: string): string {
  if (env && env.length > 0) {
    if (env.length < 8) throw new Error(`Password for ${email} must be at least 8 characters`);
    return env;
  }
  const pw = randomBytes(12).toString("base64url");
  generatedCreds.push(`  ${email}  ->  ${pw}`);
  return pw;
}

// Create the user if absent. If it already exists, only reconcile name/role -
// never overwrite the password, so a re-seed can't clobber a rotated one.
async function ensureUser(opts: {
  email: string;
  name: string;
  role: string;
  envPassword: string | undefined;
}): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (existing) {
    await prisma.user.update({ where: { email: opts.email }, data: { name: opts.name, role: opts.role } });
    console.log(`✓ ${opts.role}: ${opts.name} (${opts.email}) — already existed, password unchanged`);
    return;
  }
  const password = resolvePassword(opts.envPassword, opts.email);
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: opts.email, name: opts.name, hashedPassword, role: opts.role },
  });
  // better-auth signs users in against the credential `account` row (lib/auth.ts
  // configures the bcrypt verify), not User.hashedPassword - without this the
  // seeded login is rejected.
  await prisma.account.create({
    data: {
      id: `cred_${user.id}`,
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    },
  });
  console.log(`✓ ${opts.role}: ${opts.name} (${opts.email}) — created`);
}

async function main() {
  const user1Email = process.env.USER1_EMAIL || "admin@example.com";
  const user1Name = process.env.USER1_NAME || "Admin";

  const user2Email = process.env.USER2_EMAIL || "member@example.com";
  const user2Name = process.env.USER2_NAME || "Member";

  console.log("Seeding default categories...");
  const categories = await Promise.all(
    DEFAULT_CATEGORIES.map((cat) =>
      prisma.category.upsert({
        where: { id: defaultCategoryId(cat.name) },
        update: {},
        create: {
          id: defaultCategoryId(cat.name),
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          isDefault: true,
          userId: null,
        },
      })
    )
  );
  console.log(`✓ Created ${categories.length} default categories`);

  console.log("Seeding users...");
  await ensureUser({ email: user1Email, name: user1Name, role: "SUPER_ADMIN", envPassword: process.env.USER1_PASSWORD });
  await ensureUser({ email: user2Email, name: user2Name, role: "ADMIN", envPassword: process.env.USER2_PASSWORD });

  if (generatedCreds.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("GENERATED PASSWORDS — save these now, they are not stored:");
    generatedCreds.forEach((c) => console.log(c));
    console.log("Set USER1_PASSWORD / USER2_PASSWORD to choose your own.");
    console.log("=".repeat(60) + "\n");
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
