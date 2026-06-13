import { CheckSquare } from "lucide-react";
import { listClients, listLeads, listRoadmapItems, listRoadmapTasks, listTasks } from "@/lib/airtable";
import { getCurrentPartner } from "@/lib/auth-server";
import type { LinkableRecord } from "@/lib/types";
import TasksBoard from "@/components/TasksBoard";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import TasksTabs, { getActiveTasksTab } from "@/components/TasksTabs";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = getActiveTasksTab(tab);

  const [tasks, leads, clients, roadmapItems, roadmapTasks] = await Promise.all([
    listTasks(),
    listLeads(),
    listClients(),
    listRoadmapItems(),
    listRoadmapTasks(),
  ]);
  const partner = (await getCurrentPartner()) ?? "איתי";

  const records: LinkableRecord[] = [
    ...leads.map((lead): LinkableRecord => ({ id: lead.id, name: lead.businessName, type: "lead" })),
    ...clients.map(
      (client): LinkableRecord => ({ id: client.id, name: client.clientName, type: "client" })
    ),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
          <CheckSquare size={28} /> משימות
        </h1>
        <p className="mt-1 text-sm text-muted">
          {activeTab === "roadmap" ? "מפת הדרכים העסקית של O-I" : "משימות משותפות לשני השותפים"}
        </p>
      </div>

      <TasksTabs active={activeTab} />

      {activeTab === "roadmap" ? (
        <RoadmapTimeline items={roadmapItems} roadmapTasks={roadmapTasks} />
      ) : (
        <TasksBoard tasks={tasks} partner={partner} records={records} />
      )}
    </div>
  );
}
