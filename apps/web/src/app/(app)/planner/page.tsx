import { Metadata } from "next";
import { getPlanner } from "@/actions/planner";
import { PlannerClient } from "@/components/planner/planner-client";

export const metadata: Metadata = { title: "Planner" };

export default async function PlannerPage() {
  const planner = await getPlanner();
  return (
    <div className="max-w-[1400px] mx-auto">
      <PlannerClient planner={planner} />
    </div>
  );
}
