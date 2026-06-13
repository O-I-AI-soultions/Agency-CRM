import type { ClientRecord, LeadRecord, TaskRecord } from "@/lib/types";
import SalesPerformanceCard from "@/components/dashboard/SalesPerformanceCard";
import RecentContactsCard from "@/components/dashboard/RecentContactsCard";
import OpenTasksCard from "@/components/dashboard/OpenTasksCard";

interface RightPanelProps {
  leads: LeadRecord[];
  clients: ClientRecord[];
  tasks: TaskRecord[];
}

export default function RightPanel({ leads, clients, tasks }: RightPanelProps) {
  const sortedTasks = tasks
    .filter((task) => task.status !== "Done")
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <div className="flex w-full flex-col gap-4 lg:w-[300px] lg:shrink-0">
      <SalesPerformanceCard leads={leads} clients={clients} />
      <RecentContactsCard leads={leads} />
      <OpenTasksCard tasks={sortedTasks} />
    </div>
  );
}
