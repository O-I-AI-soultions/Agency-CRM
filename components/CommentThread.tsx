"use client";

import { useState } from "react";
import type { TaskCommentRecord } from "@/lib/types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

interface CommentThreadProps {
  comments: TaskCommentRecord[];
  onSend: (text: string) => void;
}

export default function CommentThread({ comments, onSend }: CommentThreadProps) {
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">💬 תגובות</h3>

      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-sm text-muted">אין תגובות עדיין</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-background p-2.5 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span className="font-bold text-foreground">{c.author}</span>
                <span>{formatDateTime(c.date)}</span>
              </div>
              <p className="whitespace-pre-wrap text-foreground">{c.comment}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="כתוב תגובה..."
          className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          שלח
        </button>
      </div>
    </section>
  );
}
