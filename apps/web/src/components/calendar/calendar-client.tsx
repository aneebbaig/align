"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, Bell } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from "@/actions/calendar";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  date: Date;
  startTime: string | null;
  color: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  EVENT: "bg-blue-500",
  REMINDER: "bg-amber-500",
  DEADLINE: "bg-red-500",
};

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), type: "EVENT", startTime: "", endTime: "", reminder: "NONE", isAllDay: true });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    getCalendarEvents(month, year).then((e) => setEvents(e.map((ev) => ({ ...ev, date: new Date(ev.date) }))));
  }, [month, year]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const firstDayOfWeek = getDay(startOfMonth(currentDate));

  const dayEvents = selectedDay ? events.filter((e) => isSameDay(new Date(e.date), selectedDay)) : [];

  function navigate(dir: "prev" | "next") {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(d.getMonth() + (dir === "next" ? 1 : -1));
      return nd;
    });
  }

  async function handleAddEvent() {
    if (!newEvent.title) return;
    setLoading(true);
    const result = await createCalendarEvent({ ...newEvent, isAllDay: !newEvent.startTime });
    if (result.success) {
      toast.success("Event added!");
      setAddOpen(false);
      setNewEvent({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), type: "EVENT", startTime: "", endTime: "", reminder: "NONE", isAllDay: true });
      const updated = await getCalendarEvents(month, year);
      setEvents(updated.map((e) => ({ ...e, date: new Date(e.date) })));
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await deleteCalendarEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event deleted");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">{format(currentDate, "MMMM yyyy")}</h2>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0"><Plus className="h-4 w-4" />Add Event</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border" />
          ))}
          {daysInMonth.map((day, idx) => {
            const dayEvts = events.filter((e) => isSameDay(new Date(e.date), day));
            const today = isToday(day);
            const selected = selectedDay ? isSameDay(day, selectedDay) : false;

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                className={cn(
                  "min-h-[80px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-muted/50 transition-colors",
                  (idx + firstDayOfWeek) % 7 === 6 && "border-r-0",
                  selected && "bg-primary/5",
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1",
                  today ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvts.slice(0, 3).map((e) => (
                    <div key={e.id} className={cn("text-xs px-1 py-0.5 rounded text-white truncate", TYPE_COLORS[e.type])}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvts.length > 3 && <div className="text-xs text-muted-foreground px-1">+{dayEvts.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">{format(selectedDay, "EEEE, d MMMM yyyy")}</h3>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", TYPE_COLORS[e.type])} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{e.title}</div>
                    {e.startTime && <div className="text-xs text-muted-foreground">{e.startTime}</div>}
                  </div>
                  <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-red-500 text-xs transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add event dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} placeholder="Event title" /></div>
            <div><Label>Description (optional)</Label><Input value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} placeholder="Additional details…" /></div>
            <div><Label>Date</Label><Input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time (optional)</Label><Input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent((p) => ({ ...p, startTime: e.target.value }))} /></div>
              <div><Label>End Time (optional)</Label><Input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent((p) => ({ ...p, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select onValueChange={(v) => setNewEvent((p) => ({ ...p, type: v }))} defaultValue="EVENT">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENT">Event</SelectItem>
                    <SelectItem value="REMINDER">Reminder</SelectItem>
                    <SelectItem value="DEADLINE">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reminder</Label>
                <Select onValueChange={(v) => setNewEvent((p) => ({ ...p, reminder: v }))} defaultValue="NONE">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="AT_TIME">At time</SelectItem>
                    <SelectItem value="MIN_15">15 min before</SelectItem>
                    <SelectItem value="MIN_30">30 min before</SelectItem>
                    <SelectItem value="HOUR_1">1 hour before</SelectItem>
                    <SelectItem value="DAY_1">1 day before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleAddEvent} disabled={loading}>{loading ? "Adding..." : "Add Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
