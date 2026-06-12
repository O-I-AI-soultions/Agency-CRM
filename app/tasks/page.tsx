import { listClients, listLeads, listTasks } from "@/lib/airtable";
import { getCurrentPartner } from "@/lib/auth-server";
import type { LinkableRecord } from "@/lib/types";
import TasksBoard from "@/components/TasksBoard";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, leads, clients] = await Promise.all([listTasks(), listLeads(), listClients()]);
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
        <h1 className="text-3xl font-black tracking-tight text-foreground">✅ משימות</h1>
        <p className="mt-1 text-sm text-muted">משימות משותפות לשני השותפים</p>
      </div>
      <TasksBoard tasks={tasks} partner={partner} records={records} />
    </div>
  );
}
