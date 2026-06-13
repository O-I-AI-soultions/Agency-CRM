import { redirect } from "next/navigation";
import { listClients } from "@/lib/airtable";
import { getCurrentPartner } from "@/lib/auth-server";
import ClientsTable from "@/components/ClientsTable";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }

  const clients = await listClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">לקוחות משלמים</h1>
        <p className="mt-1 text-sm text-muted">מעקב לקוחות פעילים, עלות הקמה ותשלום חודשי</p>
      </div>
      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <p className="text-sm text-muted">אין עדיין לקוחות פעילים.</p>
        </div>
      ) : (
        <ClientsTable clients={clients} />
      )}
    </div>
  );
}
