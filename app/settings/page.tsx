import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/auth-server";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
          <Settings size={28} /> הגדרות
        </h1>
        <p className="mt-1 text-sm text-muted">שינוי סיסמה עבור {partner}</p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
