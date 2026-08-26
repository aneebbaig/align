import { defineConfig } from "prisma/config";

// Load .env.local for the Prisma CLI in local dev
// (Next.js handles env loading automatically; Prisma CLI only reads .env by default)
if (process.env.NODE_ENV !== "production") {
  try {
     
    require("dotenv").config({ path: ".env.local" });
  } catch { /* dotenv optional */ }
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
