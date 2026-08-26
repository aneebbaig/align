import { Metadata } from "next";
import { getTasks } from "@/actions/tasks";
import { TasksClient } from "@/components/tasks/tasks-client";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const tasks = await getTasks();
  return (
    <div className="max-w-5xl mx-auto">
      <TasksClient tasks={tasks} />
    </div>
  );
}
