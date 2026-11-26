import { NextRequest, NextResponse } from "next/server";
import { requireBearerAuth } from "@/lib/v1-auth";
import { deleteInvestmentCategoryCore } from "@/lib/investments/delete-category";

// Removes a plan category with its investment(s), their history and the
// entries those booked. Other categories keep their percentages.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const deleted = await deleteInvestmentCategoryCore(auth.id, id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
