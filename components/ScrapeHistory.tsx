import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { ScrapeHistoryRecord } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  Running: "פועל",
  Completed: "הושלם",
  Failed: "נכשל",
};

const STATUS_ICONS: Record<string, typeof Loader2> = {
  Running: Loader2,
  Completed: CheckCircle2,
  Failed: XCircle,
};

const STATUS_TAG_CLASSES: Record<string, string> = {
  Running: "tag tag-amber",
  Completed: "tag tag-green",
  Failed: "tag tag-warn",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default function ScrapeHistory({ runs }: { runs: ScrapeHistoryRecord[] }) {
  if (runs.length === 0) {
    return (
      <div className="panel border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted">עדיין לא בוצעו סריקות.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-start">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              תאריך
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              ניישה
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עיר
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              תוצאות
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              סטטוס
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              לידים שנוצרו
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              הופעל על ידי
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {runs.map((run) => (
            <tr key={run.id} className="transition-colors hover:bg-surface-2">
              <td className="px-4 py-3 text-sm font-mono tabular-nums text-foreground/80">
                {formatDate(run.date)}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-foreground">{run.niche}</td>
              <td className="px-4 py-3 text-sm text-foreground/80">{run.city}</td>
              <td className="px-4 py-3 text-sm font-mono tabular-nums text-foreground/80">{run.limit}</td>
              <td className="px-4 py-3 text-sm">
                {run.status ? (
                  <span className={STATUS_TAG_CLASSES[run.status] ?? "tag tag-muted"}>
                    {STATUS_ICONS[run.status] &&
                      (() => {
                        const Icon = STATUS_ICONS[run.status];
                        return <Icon size={14} className={run.status === "Running" ? "animate-spin" : ""} />;
                      })()}
                    {STATUS_LABELS[run.status] ?? run.status}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-sm font-mono tabular-nums font-bold text-accent-strong">
                {run.leadsFound}
              </td>
              <td className="px-4 py-3 text-sm text-foreground/80">{run.triggeredBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
