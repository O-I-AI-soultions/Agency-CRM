"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    if (newPassword.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "סיסמה שגויה");
        setLoading(false);
        return;
      }

      setSuccess("הסיסמה שונתה בהצלחה");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLoading(false);
    } catch {
      setError("אירעה שגיאה, נסה שוב");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
            סיסמה נוכחית
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
            סיסמה חדשה
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            אימות סיסמה חדשה
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-center text-sm font-medium text-warn">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-center text-sm font-medium text-accent">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-accent px-4 py-2.5 font-bold text-white transition hover:bg-accent-strong disabled:opacity-60"
        >
          {loading ? "משנה..." : "שינוי סיסמה"}
        </button>
      </form>
    </div>
  );
}
