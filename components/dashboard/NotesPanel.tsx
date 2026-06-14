"use client";

import { useState } from "react";
import { Check, NotebookPen } from "lucide-react";

interface NotesPanelProps {
  initialContent: string;
}

export default function NotesPanel({ initialContent }: NotesPanelProps) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [saved, setSaved] = useState(false);

  async function handleBlur() {
    if (content === savedContent) return;

    const res = await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) return;

    setSavedContent(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card-shadow animate-fade-up rounded-2xl bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">פתקים</h2>
        <NotebookPen size={18} className="text-muted-2" />
      </div>
      <p className="mt-1 text-sm text-muted">מקום פנוי לכתוב הערות מהירות לעצמך</p>

      <div className="relative mt-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="כתוב הערה..."
          suppressHydrationWarning
          className="min-h-[140px] w-full resize-y rounded-xl border border-border bg-background p-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {saved && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white shadow-md"
          >
            <Check size={12} /> נשמר
          </div>
        )}
      </div>
    </div>
  );
}
