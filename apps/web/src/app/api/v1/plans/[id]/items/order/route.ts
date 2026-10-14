import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBearerAuth } from "@/lib/v1-auth";
import { reorderPlanItems } from "@/lib/plans/store";

// Drag-reorder: `ids` is the new sequence of one group of items (or the
// ungrouped ones). Everything else keeps its place.
const bodySchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    if (!(await reorderPlanItems(auth.id, id, parsed.data.ids))) {
      return NextResponse.json({ error: "Could not reorder these items" }, { status: 400 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
