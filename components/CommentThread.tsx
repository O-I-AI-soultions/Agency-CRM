"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
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
      <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted">
        <MessageCircle size={14} /> תגובות
      </h3>

      <div>
        {comments.length === 0 ? (
          <p className="text-sm text-muted">אין תגובות עדיין</p>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((c) => (
              <div key={c.id} className="py-2.5 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-bold text-foreground">{c.author}</span>
                  <span className="font-mono text-xs text-muted">{formatDateTime(c.date)}</span>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{c.comment}</p>
              </div>
            ))}
          </div>
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
          aria-label="כתוב תגובה"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="btn-primary"
        >
          שלח
        </button>
      </div>
    </section>
  );
}
