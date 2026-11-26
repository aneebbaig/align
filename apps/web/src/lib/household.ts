import { cache } from "react";
import { prisma } from "@/lib/prisma";

// One database is one household. Every login (e.g. a couple) is just another
// admin over the SAME data, so all shared data is scoped by a single id: the
// household owner, defined as the oldest user. Personal things (auth, profile,
// notification preferences, the Vault) stay tied to the real login id.
// Cached so it runs once per request.
export const getHouseholdOwnerId = cache(async (): Promise<string> => {
  const owner = await prisma.user.findFirst({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (!owner) throw new Error("Unauthorized");
  return owner.id;
});
