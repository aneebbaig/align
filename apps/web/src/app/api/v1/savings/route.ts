import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const pots = await prisma.savingsPot.findMany({
      where: { userId: auth.id },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        targetAmount: true,
        targetDate: true,
        balances: { include: { currency: true } },
      },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    });

    // Mobile only understands a base-currency balance + an optional USD
    // balance (pre-dates the household-configurable currency list on web).
    const shaped = pots.map((p) => {
      const { balances, ...rest } = p;
      const currentAmount = balances.find((b) => b.currency.isBase)?.amount ?? 0;
      const currentAmountUsd = balances.find((b) => b.currency.code === "USD" && !b.currency.isBase)?.amount ?? 0;
      return { ...rest, currentAmount, currentAmountUsd };
    });
    const totalPaisas = shaped.reduce((s, p) => s + p.currentAmount, 0);

    return NextResponse.json({
      data: {
        pots: shaped,
        totalPaisas,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
