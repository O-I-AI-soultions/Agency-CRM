"use client";

import { CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  connected: boolean;
  connectedLabel?: string;
  scopes?: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
  connectLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  deepLink?: string;
}

export default function IntegrationCard({
  icon,
  name,
  description,
  connected,
  connectedLabel,
  scopes,
  onConnect,
  onDisconnect,
  connectLabel = "חיבור",
  loading = false,
  disabled = false,
  disabledReason,
  deepLink,
}: IntegrationCardProps) {
  return (
    <div className="panel flex items-start gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-2xl">
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{name}</span>
          {connected ? (
            <span className="flex items-center gap-1 rounded-full border border-green/30 bg-green-soft px-2 py-0.5 text-xs font-medium text-green">
              <CheckCircle size={11} />
              מחובר
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
              <XCircle size={11} />
              לא מחובר
            </span>
          )}
        </div>

        <p className="text-sm text-muted">{description}</p>

        {connected && connectedLabel && (
          <p className="text-xs text-muted-2">{connectedLabel}</p>
        )}

        {connected && scopes && scopes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {scopes.map((s) => (
              <span
                key={s}
                className="rounded-md border border-accent/30 bg-accent-soft px-2 py-0.5 text-xs text-accent"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {disabled && disabledReason && (
          <p className="mt-1 text-xs text-warn">{disabledReason}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        {deepLink ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            פתח
            <ExternalLink size={13} />
          </a>
        ) : connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={loading}
            className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-1.5 text-sm font-medium text-warn transition-colors hover:border-warn hover:bg-warn/10 focus:outline-none focus:ring-2 focus:ring-warn/30 disabled:opacity-50"
          >
            {loading ? "..." : "ניתוק"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={loading || disabled}
            className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {loading ? "..." : connectLabel}
          </button>
        )}
      </div>
    </div>
  );
}
