import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, bearer } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * better-auth is the single auth system (fleet standard). Align specifics:
 * - Custom bcrypt hash/verify so EXISTING users (whose passwords are bcrypt
 *   `hashedPassword` values, backfilled into the account table) keep working.
 * - disableSignUp: multi-user household, no open registration. New users are
 *   created by a SUPER_ADMIN through auth.api server-side.
 * - bearer: token auth for the Flutter client hitting the same backend.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    disableSignUp: true,
    password: {
      hash: async (password) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "ADMIN", input: false },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  plugins: [twoFactor(), bearer(), nextCookies()],
});
