import Link from "next/link";
import { Calendar, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startTime: string | null;
  color: string | null;
}

const TYPE_STYLES: Record<string, { icon: typeof Calendar; className: string }> = {
  EVENT: { icon: Calendar, className: "text-blue-600" },
  REMINDER: { icon: Bell, className: "text-amber-600" },
  DEADLINE: { icon: Clock, className: "text-red-600" },
};

export function TodaySchedule({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Today&apos;s Schedule</h3>
        <Link href="/calendar" className="text-xs text-primary hover:underline">View calendar</Link>
      </div>

      {events.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Nothing scheduled for today
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const { icon: Icon, className } = TYPE_STYLES[event.type] ?? TYPE_STYLES.EVENT;
            return (
              <div key={event.id} className="flex items-center gap-3 py-2">
                <div className={cn("shrink-0", className)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate block">{event.title}</span>
                  {event.startTime && (
                    <span className="text-xs text-muted-foreground">{event.startTime}</span>
                  )}
                </div>
                {event.color && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
