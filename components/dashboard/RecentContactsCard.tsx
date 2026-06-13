import type { LeadRecord } from "@/lib/types";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #3B82F6, #8B5CF6)",
  "linear-gradient(135deg, #10B981, #0D9488)",
  "linear-gradient(135deg, #F59E0B, #EF4444)",
  "linear-gradient(135deg, #8B5CF6, #EC4899)",
];

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays <= 0) return "היום";
  if (diffDays === 1) return "לפני יום";
  return `לפני ${diffDays} ימים`;
}

interface RecentContactsCardProps {
  leads: LeadRecord[];
}

export default function RecentContactsCard({ leads }: RecentContactsCardProps) {
  const recent = [...leads]
    .sort((a, b) => {
      const aTime = new Date(a.lastContacted ?? a.createdTime).getTime();
      const bTime = new Date(b.lastContacted ?? b.createdTime).getTime();
      return bTime - aTime;
    })
    .slice(0, 3);

  return (
    <div
      className="card-shadow animate-fade-up rounded-2xl bg-surface p-5"
      style={{ animationDelay: "0.2s" }}
    >
      <h3 className="text-[13px] font-semibold text-muted">אנשי קשר אחרונים</h3>

      <div className="mt-3 space-y-3">
        {recent.length === 0 && <p className="text-xs text-muted-2">אין עדיין לידים</p>}

        {recent.map((lead, i) => (
          <div key={lead.id} className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white"
              style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}
            >
              {lead.businessName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{lead.businessName}</p>
              <p className="truncate text-xs text-muted-2">{lead.city ?? lead.niche ?? "—"}</p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-2">
              {relativeTime(lead.lastContacted ?? lead.createdTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
