"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListTodo, GripVertical } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateTaskOrder, createTask } from "@/actions/tasks";
import { DueDateChips } from "@/components/shared/due-date-chips";
import { useAddShortcut } from "@/lib/use-add-shortcut";
import { PageHeader } from "@/components/shared/page-header";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  dueTime: string | null;
  category: string | null;
  order: number;
}

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group/sortable">
      <button
        {...attributes}
        {...listeners}
        className="mt-3 shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TaskCard task={task} />
      </div>
    </div>
  );
}

function SortableList({ tasks, onReorder }: { tasks: Task[]; onReorder: (tasks: Task[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    onReorder(reordered);

    const updates = reordered.map((t, i) => ({ id: t.id, order: i + 1 }));
    updateTaskOrder(updates);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => <SortableTask key={task.id} task={task} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function TasksClient({ tasks: initialTasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"DAILY" | "ONE_TIME">("ONE_TIME");

  const [tab, setTab] = useState("one-time");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDue, setQuickDue] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const quickRef = useRef<HTMLInputElement>(null);

  const split = (tasks: Task[]) => ({
    daily: tasks.filter((t) => t.type === "DAILY"),
    pending: tasks.filter((t) => t.type === "ONE_TIME" && t.status !== "DONE"),
    done: tasks.filter((t) => t.type === "ONE_TIME" && t.status === "DONE"),
  });
  const [lists, setLists] = useState(() => split(initialTasks));
  const [seen, setSeen] = useState(initialTasks);
  if (seen !== initialTasks) {
    setSeen(initialTasks);
    setLists(split(initialTasks));
  }
  const { daily, pending, done } = lists;
  const setDaily = (d: Task[]) => setLists((l) => ({ ...l, daily: d }));
  const setPending = (p: Task[]) => setLists((l) => ({ ...l, pending: p }));

  const focusQuick = useCallback(() => quickRef.current?.focus(), []);
  useAddShortcut(open, focusQuick);

  async function quickAdd() {
    const title = quickTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    const isDaily = tab === "daily";
    const result = await createTask({
      title,
      type: isDaily ? "DAILY" : "ONE_TIME",
      priority: "MEDIUM",
      dueDate: !isDaily && quickDue ? quickDue : undefined,
    });
    setAdding(false);
    if (result.success) {
      setQuickTitle("");
      setQuickDue(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to add task");
    }
    quickRef.current?.focus();
  }

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        section="Life"
        title="Tasks"
        action={
          <Button onClick={() => { setDefaultType("ONE_TIME"); setOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        }
      />

      <div className="mb-4 space-y-2">
        <Input
          ref={quickRef}
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void quickAdd(); } }}
          placeholder={tab === "daily" ? "Add a daily task and press Enter (N)" : "Add a task and press Enter (N)"}
          aria-label="Quick add task"
        />
        {tab !== "daily" && <DueDateChips value={quickDue} onChange={setQuickDue} compact />}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="daily">Daily ({daily.length})</TabsTrigger>
          <TabsTrigger value="one-time">One-Time ({pending.length + done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          {daily.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No daily tasks"
              description="Add recurring daily tasks like exercise, reviewing expenses, or taking vitamins."
              action={{ label: "Add daily task", onClick: () => { setDefaultType("DAILY"); setOpen(true); } }}
            />
          ) : (
            <SortableList tasks={daily} onReorder={setDaily} />
          )}
        </TabsContent>

        <TabsContent value="one-time" className="mt-4 space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                Pending - drag to set priority order
              </h3>
              <SortableList tasks={pending} onReorder={setPending} />
            </div>
          )}
          {done.length > 0 && (
            <div className="opacity-60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Completed</h3>
              <div className="space-y-2">
                {done.map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          )}
          {pending.length === 0 && done.length === 0 && (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Add things you need to get done - fix the shower, call the electrician, renew documents."
              action={{ label: "Add task", onClick: () => { setDefaultType("ONE_TIME"); setOpen(true); } }}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <TaskForm defaultType={defaultType} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
