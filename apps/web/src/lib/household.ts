import { prisma } from "@/lib/prisma";

// One database is one household (1-2 users). The budget, categories, currencies
// and the daily email are household-wide, so budget totals sum over these ids.
export async function getHouseholdUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({ select: { id: true } });
  return users.map((u) => u.id);
}
