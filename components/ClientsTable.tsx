import type { ClientRecord } from "@/lib/types";
import StatusToggle from "@/components/StatusToggle";

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return `₪${value.toLocaleString("he-IL")}`;
}

export default function ClientsTable({ clients }: { clients: ClientRecord[] }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-start">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              שם לקוח
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עלות הקמה
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              תשלום חודשי
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              סטטוס
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={client.id} className="transition-colors hover:bg-surface-2">
              <td className="px-4 py-3 text-sm font-bold text-foreground">
                {client.clientName}
              </td>
              <td className="px-4 py-3 text-sm font-mono tabular-nums text-foreground/80">
                {formatCurrency(client.setupFee)}
              </td>
              <td className="px-4 py-3 text-sm font-mono tabular-nums text-foreground/80">
                {formatCurrency(client.monthlyRetainer)}
              </td>
              <td className="px-4 py-3 text-sm">
                <StatusToggle clientId={client.id} currentStatus={client.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
