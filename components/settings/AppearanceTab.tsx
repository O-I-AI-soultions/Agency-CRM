"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function AppearanceTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">ערכת נושא</p>
            <p className="mt-0.5 text-sm text-muted">
              בחר בין מצב כהה למצב בהיר. הבחירה נשמרת בדפדפן.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="panel p-5 opacity-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">צפיפות תצוגה</p>
            <p className="mt-0.5 text-sm text-muted">רווחי רשומות בטבלאות ובקנבן — בקרוב.</p>
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
            בקרוב
          </span>
        </div>
      </div>

      <div className="panel p-5 opacity-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">שפה</p>
            <p className="mt-0.5 text-sm text-muted">ממשק בעברית — תמיכה בשפות נוספות בקרוב.</p>
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
            עברית
          </span>
        </div>
      </div>
    </div>
  );
}
