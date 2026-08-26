import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id: loanId, scheduleId } = await params;

  try {
    const deleted = await prisma.loanSchedule.deleteMany({
      where: { id: scheduleId, loanId, userId: auth.id },
    });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id: scheduleId } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
