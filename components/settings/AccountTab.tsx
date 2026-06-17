import ChangePasswordForm from "@/components/ChangePasswordForm";
import type { Partner } from "@/lib/auth";

interface AccountTabProps {
  partner: Partner;
}

export default function AccountTab({ partner }: AccountTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">שותף נוכחי</p>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-mono text-sm font-bold text-accent-foreground">
            {partner.charAt(0)}
          </span>
          <div>
            <p className="font-semibold text-foreground">{partner}</p>
            <p className="text-xs text-muted">O·I CRM</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">שינוי סיסמה</h3>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
