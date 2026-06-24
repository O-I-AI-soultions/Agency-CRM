import { redirect } from "next/navigation";
import { getPartnerNoteSafe, listClients, listLeads, listTasks } from "@/lib/airtable";
import { getCurrentPartner } from "@/lib/auth-server";
import UrgentLeadsCard from "@/components/dashboard/UrgentLeadsCard";
import NotesPanel from "@/components/dashboard/NotesPanel";
import TopHeader from "@/components/dashboard/TopHeader";
import RightPanel from "@/components/dashboard/RightPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }

  const [leads, clients, tasks, note] = await Promise.all([
    listLeads(),
    listClients(),
    listTasks(),
    getPartnerNoteSafe(partner),
  ]);

  return (
    <div className="space-y-4">
      <TopHeader title="דשבורד" subtitle={`ברוך שובך, ${partner}!`} partner={partner} />
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4 overflow-hidden">
          <UrgentLeadsCard leads={leads} partner={partner} />
          <NotesPanel initialContent={note?.content ?? ""} />
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
