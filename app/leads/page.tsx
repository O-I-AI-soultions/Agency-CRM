import { listLeads } from "@/lib/airtable";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">ניהול לידים</h1>
        <p className="mt-1 text-sm text-muted">
          {leads.length} לידים בצנרת — לחיצה על כרטיס פותחת את פרטי הליד
        </p>
      </div>
      <KanbanBoard leads={leads} />
    </div>
  );
}
