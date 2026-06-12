"use client";

import { useState } from "react";
import { PARTNERS, type Partner } from "@/lib/auth";

export default function LoginPage() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!partner) {
      setError("בחר/י משתמש");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "סיסמה שגויה");
        setLoading(false);
        return;
      }

      window.location.href = "/leads";
    } catch {
      setError("אירעה שגיאה, נסה שוב");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent-soft blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-sky-soft blur-3xl"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl shadow-black/5">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-base font-black text-white">
            O·I
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              כניסה למערכת
            </h1>
            <p className="mt-1 text-sm text-muted">מערכת ניהול לידים ולקוחות</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">מי אתה?</span>
            <div className="flex gap-2">
              {PARTNERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPartner(name)}
                  className={
                    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-accent/20 " +
                    (partner === name
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-background text-foreground hover:border-accent/40")
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-center text-sm font-medium text-warn">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-accent px-4 py-2.5 font-bold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
