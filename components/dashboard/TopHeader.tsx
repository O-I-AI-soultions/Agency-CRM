import Link from "next/link";
import { Search, Bell, ChevronDown, Plus } from "lucide-react";
import type { Partner } from "@/lib/auth";

interface TopHeaderProps {
  title: string;
  subtitle: string;
  partner: Partner;
}

export default function TopHeader({ title, subtitle, partner }: TopHeaderProps) {
  return (
    <header className="card-shadow flex flex-wrap items-center gap-4 rounded-2xl bg-surface px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-7 sm:py-0">
      <div className="min-w-0 flex-1 sm:flex-initial">
        <h1 className="truncate font-display text-xl font-semibold text-foreground">{title}</h1>
        <p className="truncate text-[13px] text-muted">{subtitle}</p>
      </div>

      <div className="order-last w-full sm:order-none sm:flex sm:flex-1 sm:justify-center">
        <div className="flex w-full items-center gap-2 rounded-[10px] border border-border bg-background px-3.5 py-2 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] sm:max-w-[340px]">
          <Search size={16} className="text-muted-2 shrink-0" />
          <input
            type="text"
            placeholder="חיפוש..."
            suppressHydrationWarning
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="התראות"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <Bell size={20} />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-warn ring-2 ring-surface" />
      </button>

      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}
        >
          {partner.charAt(0)}
        </span>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-foreground">{partner}</p>
          <p className="text-xs text-muted-2">O-I</p>
        </div>
        <ChevronDown size={14} className="hidden text-muted-2 sm:block" />
      </div>

      <Link
        href="/leads?tab=scrape"
        className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-[18px] py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-accent-strong"
      >
        <Plus size={16} />
        חדש
      </Link>
    </header>
  );
}
