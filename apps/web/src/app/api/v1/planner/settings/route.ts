import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { settingsSchema } from "@/lib/planner/schemas";
import { getPlanner, updateSettings } from "@/lib/planner/store";

export async function PATCH(req: NextRequest) {
  return plannerResponse(req, async (userId) => {
    await updateSettings(userId, settingsSchema.parse(await req.json()));
    return (await getPlanner(userId)).settings;
  });
}
