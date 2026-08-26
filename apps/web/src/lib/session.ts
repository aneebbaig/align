import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Shape the rest of the app relies on (id/email/name/role). Backed by
// better-auth sessions now; the interface is unchanged so callers of
// getServerUser/requireUser/getUserId keep working.
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function getServerUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as { id: string; email: string; name?: string | null; role?: string | null };
  return { id: u.id, email: u.email, name: u.name ?? "", role: u.role ?? "ADMIN" };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  return user;
}

export async function getUserId(): Promise<string> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function getAuthenticatedUser<S extends Record<string, unknown>>(
  select: S,
): Promise<{ id: string } & { [K in keyof S]: unknown }> {
  const authUser = await getServerUser();
  if (!authUser) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, ...select },
  });
  if (!user) throw new Error("Unauthorized");
  return user as { id: string } & { [K in keyof S]: unknown };
}
