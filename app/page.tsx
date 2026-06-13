import { listClients, listLeads, listTasks } from "@/lib/airtable";
import { getCurrentPartner } from "@/lib/auth-server";
import KanbanBoard from "@/components/KanbanBoard";
import TopHeader from "@/components/dashboard/TopHeader";
import RightPanel from "@/components/dashboard/RightPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [leads, clients, tasks] = await Promise.all([listLeads(), listClients(), listTasks()]);
  const partner = (await getCurrentPartner()) ?? "איתי";

  return (
    <div className="space-y-4">
      <TopHeader title="דשבורד" subtitle={`ברוך שובך, ${partner}!`} partner={partner} />
      <div className="flex gap-4">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard leads={leads} partner={partner} />
        </div>
        <RightPanel
          leads={leads}
          clients={clients}
          tasks={tasks.filter((task) => task.owner === partner)}
        />
      </div>
    </div>
  );
}
