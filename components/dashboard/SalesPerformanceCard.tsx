import type { ClientRecord, LeadRecord } from "@/lib/types";

const DAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function formatCurrency(value: number): string {
  return `₪${value.toLocaleString("he-IL")}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

interface SalesPerformanceCardProps {
  leads: LeadRecord[];
  clients: ClientRecord[];
}

export default function SalesPerformanceCard({ leads, clients }: SalesPerformanceCardProps) {
  const mrr = clients
    .filter((client) => client.status === "Active")
    .reduce((sum, client) => sum + (client.monthlyRetainer ?? 0), 0);

  const today = startOfDay(new Date());
  const counts = Array(7).fill(0);
  let thisWeek = 0;
  let prevWeek = 0;

  for (const lead of leads) {
    const created = startOfDay(new Date(lead.createdTime));
    const diffDays = Math.floor((today.getTime() - created.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7) {
      counts[created.getDay()] += 1;
      thisWeek += 1;
    } else if (diffDays >= 7 && diffDays < 14) {
      prevWeek += 1;
    }
  }

  const maxCount = Math.max(...counts, 1);
  const growth =
    prevWeek === 0 ? (thisWeek > 0 ? 100 : 0) : ((thisWeek - prevWeek) / prevWeek) * 100;
  const isPositive = growth >= 0;

  return (
    <div
      className="card-shadow animate-fade-up rounded-2xl bg-surface p-5"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-muted">ביצועי מכירות</h2>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-strong">
          החודש
        </span>
      </div>

      <p className="mt-2 font-display text-[28px] font-bold text-foreground">
        {formatCurrency(mrr)}
      </p>
      <p className="text-xs text-muted-2">הכנסה חודשית חזויה (MRR)</p>

      <div className="mt-4 flex items-end gap-1.5" style={{ height: "80px" }}>
        {counts.map((count, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-[6px]"
              style={{
                height: `${Math.max((count / maxCount) * 100, 6)}%`,
                backgroundColor: i % 2 === 0 ? "var(--color-accent)" : "var(--color-green)",
              }}
            />
            <span className="text-[10px] text-muted-2">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">{thisWeek} לידים חדשים השבוע</span>
        <span
          className={
            "rounded-md px-2 py-0.5 text-[13px] font-semibold " +
            (isPositive ? "bg-green-soft text-green" : "bg-warn-soft text-warn")
          }
        >
          {isPositive ? "▲" : "▼"} {Math.abs(Math.round(growth * 10) / 10)}%
        </span>
      </div>
    </div>
  );
}
