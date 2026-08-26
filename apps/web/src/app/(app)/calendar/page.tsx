import { Metadata } from "next";
import { CalendarClient } from "@/components/calendar/calendar-client";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your schedule at a glance</p>
      </div>
      <CalendarClient />
    </div>
  );
}
