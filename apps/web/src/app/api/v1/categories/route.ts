import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const typeParam = req.nextUrl.searchParams.get("type");
    const typeFilter =
      typeParam === "INCOME" ? ["INCOME", "BOTH"] : ["EXPENSE", "BOTH"];

    const categories = await prisma.category.findMany({
      where: {
        isHidden: false,
        type: { in: typeFilter },
        OR: [{ userId: null }, { userId: auth.id }],
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        isDefault: true,
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: categories });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
