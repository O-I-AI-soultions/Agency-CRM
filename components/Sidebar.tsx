"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Partner } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "דשבורד" },
  { href: "/leads", icon: "📋", label: "לידים" },
  { href: "/tasks", icon: "✅", label: "משימות" },
  { href: "/clients", icon: "👥", label: "לקוחות" },
];

interface SidebarProps {
  partner: Partner;
}

export default function Sidebar({ partner }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="פתח תפריט"
        className="fixed top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-lg text-foreground shadow-sm md:hidden"
      >
        ☰
      </button>

      {isOpen && (
        <div
          aria-hidden
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface px-4 py-6 transition-transform duration-200 md:translate-x-0 " +
          (isOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-black text-white">
            O·I
          </span>
          <span className="text-sm font-bold text-foreground">מערכת ניהול O-I</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors " +
                (isActive(item.href)
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:bg-background hover:text-foreground")
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-border pt-4">
          <p className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-foreground">
            <span className="text-lg">👤</span> {partner}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded-xl px-3 py-2 text-right text-sm font-medium text-muted transition-colors hover:bg-warn-soft hover:text-warn"
          >
            התנתק
          </button>
        </div>
      </aside>
    </>
  );
}
