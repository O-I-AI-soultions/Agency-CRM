import { PartyPopper } from "lucide-react";
import { redirect } from "next/navigation";
import { listLeads, listScrapeHistory } from "@/lib/airtable";
import { computePriority } from "@/lib/priority";
import { getCurrentPartner } from "@/lib/auth-server";
import KanbanBoard from "@/components/KanbanBoard";
import CallListTable from "@/components/CallListTable";
import ScrapeForm from "@/components/ScrapeForm";
import ScrapeHistory from "@/components/ScrapeHistory";
import LeadsTabs, { getActiveTab } from "@/components/LeadsTabs";

export const dynamic = "force-dynamic";

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

const TAB_META = {
  kanban: {
    title: "ניהול לידים",
    subtitle: "לחיצה על כרטיס פותחת את פרטי הליד",
  },
  calls: {
    title: "רשימת שיחות להיום",
    subtitle: "הלידים הדחופים ביותר ליצירת קשר היום, מסודרים לפי עדיפות",
  },
  scrape: {
    title: "סריקת לידים",
    subtitle: "הפעלת סריקה חדשה ב-Apify ומעקב אחר היסטוריית הסריקות",
  },
} as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }

  const { tab } = await searchParams;
  const activeTab = getActiveTab(tab);
  const meta = TAB_META[activeTab];

  const leads = await listLeads();

  let content: React.ReactNode;

  if (activeTab === "kanban") {
    content = <KanbanBoard leads={leads} partner={partner} />;
  } else if (activeTab === "calls") {
    const callList = leads
      .filter(
        (lead) =>
          (lead.status === "New Lead" || lead.status === "Contacted" || lead.status === null) &&
          !(lead.lastContacted && isToday(lead.lastContacted))
      )
      .map((lead) => ({ lead, ...computePriority(lead) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    content =
      callList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
            <PartyPopper size={16} /> כל הכבוד! אין לידים דחופים להיום
          </p>
        </div>
      ) : (
        <CallListTable items={callList} partner={partner} />
      );
  } else {
    const runs = await listScrapeHistory();
    content = (
      <div className="space-y-6">
        <ScrapeForm />
        <div>
          <h2 className="mb-3 text-lg font-bold text-foreground">היסטוריית סריקות</h2>
          <ScrapeHistory runs={runs} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted">{meta.subtitle}</p>
      </div>
      <LeadsTabs active={activeTab} />
      {content}
    </div>
  );
}
