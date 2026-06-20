"use client";

import { useEffect, useRef, useState } from "react";
import { X, Phone, MessageCircle, MapPin, Star, Check, PartyPopper, AlertTriangle, Globe } from "lucide-react";
import { KANBAN_STATUSES, type KanbanStatus, type LeadRecord } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import PriorityBadge from "@/components/PriorityBadge";
import { toWhatsAppNumber, buildWhatsAppMessage } from "@/lib/whatsapp";
import { generateSiteClient, checkDeployStatusClient, type SiteCategory } from "@/lib/leads-client";

const DEPLOY_POLL_INTERVAL_MS = 5000;
const DEPLOY_POLL_MAX_ATTEMPTS = 36; // ~3 minutes at 5s intervals

const STATUS_LABELS: Record<KanbanStatus, string> = {
  "New Lead": "לידים חדשים",
  Contacted: "נוצר קשר",
  "Pitch Sent": "הצעה נשלחה",
  "Not Interested": "לא מעוניין",
};

const NEXT_ACTION_OPTIONS: { label: string; value: string }[] = [
  { label: "לא נקבע", value: "" },
  { label: "להתקשר שוב", value: "להתקשר שוב" },
  { label: "לשלוח הצעה ב-WhatsApp", value: "לשלוח הצעה ב-WhatsApp" },
  { label: "לשלוח הצעה במייל", value: "לשלוח הצעה במייל" },
  { label: "לקבוע פגישה", value: "לקבוע פגישה" },
  { label: "לחכות שבוע", value: "לחכות שבוע" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function renderStars(rating: number) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={14} className={i < filled ? "fill-current" : "text-border"} />
  ));
}

interface LeadDrawerProps {
  lead: LeadRecord | null;
  partner: Partner;
  onClose: () => void;
  onUpdate: (updated: LeadRecord) => void;
}

type ToastContent = { icon: typeof Check; text: string; variant?: "success" | "error" };

export default function LeadDrawer({ lead, partner, onClose, onUpdate }: LeadDrawerProps) {
  const [localLead, setLocalLead] = useState<LeadRecord | null>(lead);
  const [notesValue, setNotesValue] = useState(lead?.notes ?? "");
  const [openLeadId, setOpenLeadId] = useState<string | null>(lead?.id ?? null);
  const [toast, setToast] = useState<ToastContent | null>(null);
  const [savingFooter, setSavingFooter] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [setupFee, setSetupFee] = useState("");
  const [monthlyRetainer, setMonthlyRetainer] = useState("");
  const [convertSaving, setConvertSaving] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [siteCategory, setSiteCategory] = useState<SiteCategory>("landing");
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [sitePartialRepoUrl, setSitePartialRepoUrl] = useState<string | null>(null);
  const [siteResultUrl, setSiteResultUrl] = useState<string | null>(null);
  const [siteLiveUrl, setSiteLiveUrl] = useState<string | null>(null);
  const [siteDeployStatus, setSiteDeployStatus] = useState<
    "idle" | "deploying" | "ready" | "timeout" | "error"
  >("idle");
  // Interval id for the deploy-status poll. A ref (not state) since it's an
  // imperative handle, not something the render output depends on.
  const deployPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopDeployPolling() {
    if (deployPollRef.current) {
      clearInterval(deployPollRef.current);
      deployPollRef.current = null;
    }
  }

  const isOpen = lead !== null;

  if (lead && lead.id !== openLeadId) {
    setOpenLeadId(lead.id);
    setLocalLead(lead);
    setNotesValue(lead.notes ?? "");
    setShowConvertModal(false);
    setSetupFee("");
    setMonthlyRetainer("");
    setShowSiteModal(false);
    setSiteCategory("landing");
    setSiteSaving(false);
    setSiteError(null);
    setSitePartialRepoUrl(null);
    setSiteResultUrl(null);
    setSiteLiveUrl(null);
    setSiteDeployStatus("idle");
  }

  // Stop any in-flight deploy-status poll whenever the open lead changes or
  // the drawer unmounts (covers both switching leads and closing mid-poll).
  useEffect(() => {
    return () => stopDeployPolling();
  }, [openLeadId]);

  // The drawer is kept mounted by its parents (KanbanBoard, UrgentLeadsCard)
  // even when closed — `lead` just becomes null and the drawer CSS-slides
  // offscreen. The effect above is keyed on `openLeadId`, which the
  // `lead && ...` render-time block never updates when `lead` goes null, so
  // closing the drawer (overlay click / X / Escape) would otherwise leave any
  // in-flight deploy-status poll running invisibly. Stop it explicitly
  // whenever the drawer closes, same as `closeSiteModal` does for its modal.
  useEffect(() => {
    if (!isOpen) stopDeployPolling();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  function showToast(toast: ToastContent) {
    setToast(toast);
    setTimeout(() => setToast(null), toast.variant === "error" ? 3000 : 2000);
  }

  async function patchLead(body: Record<string, unknown>): Promise<boolean> {
    if (!localLead) return false;
    const res = await fetch(`/api/leads/${localLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async function handleStatusChange(newStatus: KanbanStatus) {
    if (!localLead) return;
    const ok = await patchLead({ status: newStatus });
    if (!ok) return;

    let updated: LeadRecord = { ...localLead, status: newStatus };
    if (newStatus === "Contacted") {
      updated = {
        ...updated,
        lastContacted: new Date().toISOString(),
        followUpCount: (localLead.followUpCount ?? 0) + 1,
      };
    }
    setLocalLead(updated);
    onUpdate(updated);
  }

  async function handleNextActionChange(value: string) {
    if (!localLead) return;
    const ok = await patchLead({ nextAction: value });
    if (!ok) return;

    const updated = { ...localLead, nextAction: value };
    setLocalLead(updated);
    onUpdate(updated);
  }

  async function handleNotesBlur() {
    if (!localLead) return;
    if (notesValue === (localLead.notes ?? "")) return;

    const ok = await patchLead({ notes: notesValue });
    if (!ok) return;

    const updated = { ...localLead, notes: notesValue };
    setLocalLead(updated);
    onUpdate(updated);
    showToast({ icon: Check, text: "נשמר" });
  }

  async function handleMarkContacted() {
    if (!localLead) return;
    setSavingFooter(true);
    try {
      const ok = await patchLead({ status: "Contacted" });
      if (!ok) return;

      const updated: LeadRecord = {
        ...localLead,
        status: "Contacted",
        lastContacted: new Date().toISOString(),
        followUpCount: (localLead.followUpCount ?? 0) + 1,
      };
      setLocalLead(updated);
      onUpdate(updated);
      showToast({ icon: Check, text: "הליד עודכן" });
    } finally {
      setSavingFooter(false);
    }
  }

  async function handleConvertConfirm() {
    if (!localLead) return;
    setConvertSaving(true);
    try {
      const res = await fetch(`/api/leads/${localLead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: localLead.businessName,
          setupFee: setupFee === "" ? 0 : Number(setupFee),
          monthlyRetainer: monthlyRetainer === "" ? 0 : Number(monthlyRetainer),
        }),
      });

      if (!res.ok) {
        showToast({
          icon: AlertTriangle,
          text: "שגיאה בהמרת הליד ללקוח, נסה שוב",
          variant: "error",
        });
        return;
      }

      const updated: LeadRecord = { ...localLead, status: "Converted" };
      setLocalLead(updated);
      setShowConvertModal(false);
      onUpdate(updated);
      showToast({ icon: PartyPopper, text: "לקוח חדש נוצר!" });
      setTimeout(() => onClose(), 600);
    } catch {
      showToast({
        icon: AlertTriangle,
        text: "שגיאה בהמרת הליד ללקוח, נסה שוב",
        variant: "error",
      });
    } finally {
      setConvertSaving(false);
    }
  }

  function startDeployPolling(leadId: string, deploymentId: string) {
    stopDeployPolling();
    setSiteDeployStatus("deploying");

    let attempts = 0;
    deployPollRef.current = setInterval(async () => {
      attempts += 1;
      const result = await checkDeployStatusClient(leadId, deploymentId);

      if (result.status === "ready") {
        stopDeployPolling();
        setSiteLiveUrl(result.liveUrl);
        setSiteDeployStatus("ready");
        showToast({ icon: PartyPopper, text: "האתר באוויר!" });
        return;
      }

      if (result.status === "error") {
        stopDeployPolling();
        setSiteDeployStatus("error");
        setSiteError(result.error);
        return;
      }

      // still "building" — keep polling unless we've hit the attempt cap.
      if (attempts >= DEPLOY_POLL_MAX_ATTEMPTS) {
        stopDeployPolling();
        setSiteDeployStatus("timeout");
      }
    }, DEPLOY_POLL_INTERVAL_MS);
  }

  async function handleGenerateSiteConfirm() {
    if (!localLead) return;
    setSiteSaving(true);
    setSiteError(null);
    setSitePartialRepoUrl(null);
    try {
      const result = await generateSiteClient(localLead.id, siteCategory);
      if (!result.ok) {
        setSiteError(result.error ?? "שגיאה ביצירת האתר");
        setSitePartialRepoUrl(result.partialRepoUrl ?? null);
        return;
      }
      setSiteResultUrl(result.repoUrl ?? null);
      showToast({ icon: PartyPopper, text: "האתר נוצר!" });
      if (result.deploymentId) {
        startDeployPolling(localLead.id, result.deploymentId);
      }
    } catch {
      setSiteError("שגיאה ביצירת האתר");
    } finally {
      setSiteSaving(false);
    }
  }

  function closeSiteModal() {
    setShowSiteModal(false);
    setSiteCategory("landing");
    setSiteError(null);
    setSitePartialRepoUrl(null);
    setSiteResultUrl(null);
    setSiteLiveUrl(null);
    setSiteDeployStatus("idle");
    stopDeployPolling();
  }

  const statusValue: KanbanStatus =
    localLead?.status && (KANBAN_STATUSES as readonly string[]).includes(localLead.status)
      ? (localLead.status as KanbanStatus)
      : "New Lead";

  const showMarkContacted = localLead?.status === "New Lead" || localLead?.status === null;
  const showConvert = localLead?.status === "Pitch Sent";

  const pillClasses =
    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-bold text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-drawer-title"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-s border-border bg-surface shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {localLead && (
          <div className="relative flex min-h-full flex-col">
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <X size={18} />
            </button>

            {toast && (
              <div
                role="status"
                aria-live="polite"
                className={`pointer-events-none absolute top-4 right-1/2 z-10 flex translate-x-1/2 items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-bold shadow-md ${
                  toast.variant === "error"
                    ? "border-warn/30 bg-warn-soft text-warn"
                    : "border-accent/30 bg-accent-soft text-accent"
                }`}
              >
                <toast.icon size={14} /> {toast.text}
              </div>
            )}

            <div className="border-b border-border p-4 pl-14">
              <h2 id="lead-drawer-title" className="text-xl font-black leading-snug text-foreground">
                {localLead.businessName}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <PriorityBadge lead={localLead} />
                {localLead.city && <span className="text-sm text-muted">{localLead.city}</span>}
                {localLead.googleRating != null && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-amber">
                    <span dir="ltr" className="flex items-center">
                      {renderStars(localLead.googleRating)}
                    </span>
                    <span className="font-mono">{localLead.googleRating}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6 p-4">
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  פעולות מהירות
                </h3>
                <div className="flex gap-2">
                  {localLead.phoneNumber ? (
                    <a href={`tel:${localLead.phoneNumber}`} className={pillClasses}>
                      <Phone size={14} /> חייג
                    </a>
                  ) : (
                    <span className={`${pillClasses} cursor-not-allowed opacity-50`}>
                      <Phone size={14} /> חייג
                    </span>
                  )}
                  {localLead.phoneNumber ? (
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(localLead.phoneNumber)}?text=${buildWhatsAppMessage(partner)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={pillClasses}
                    >
                      <MessageCircle size={14} /> וואטסאפ
                    </a>
                  ) : (
                    <span className={`${pillClasses} cursor-not-allowed opacity-50`}>
                      <MessageCircle size={14} /> וואטסאפ
                    </span>
                  )}
                  {localLead.googleMapsLink ? (
                    <a
                      href={localLead.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={pillClasses}
                    >
                      <MapPin size={14} /> מפות
                    </a>
                  ) : (
                    <span className={`${pillClasses} cursor-not-allowed opacity-50`}>
                      <MapPin size={14} /> מפות
                    </span>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  פרטי קשר
                </h3>
                {localLead.phoneNumber && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">טלפון</span>
                    <span dir="ltr" className="font-mono font-medium text-foreground">
                      {localLead.phoneNumber}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">אימייל</span>
                  {localLead.email ? (
                    <span dir="ltr" className="font-mono font-medium text-foreground">
                      {localLead.email}
                    </span>
                  ) : (
                    <span className="text-muted">לא הוזן אימייל</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">כתובת</span>
                  {localLead.address ? (
                    <span className="font-medium text-foreground">{localLead.address}</span>
                  ) : (
                    <span className="text-muted">לא הוזנה כתובת</span>
                  )}
                </div>
                {localLead.city && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">עיר</span>
                    <span className="font-medium text-foreground">{localLead.city}</span>
                  </div>
                )}
                {localLead.leadSource && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">מקור</span>
                    <span className="font-medium text-foreground">{localLead.leadSource}</span>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  סטטוס ומעקב
                </h3>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-muted">סטטוס</span>
                  <select
                    value={statusValue}
                    onChange={(e) => handleStatusChange(e.target.value as KanbanStatus)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {KANBAN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-muted">פעולה הבאה</span>
                  <select
                    value={localLead.nextAction ?? ""}
                    onChange={(e) => handleNextActionChange(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {NEXT_ACTION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">תאריך יצירה</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatDate(localLead.createdTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">יצירת קשר אחרונה</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatDateTime(localLead.lastContacted)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">מספר מעקבים</span>
                  <span className="font-mono font-medium text-foreground">
                    {localLead.followUpCount ?? 0}
                  </span>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">הערות</h3>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="הוסף הערה..."
                  className="w-full min-h-[120px] resize-y rounded-lg border border-border bg-background p-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </section>
            </div>

            {showMarkContacted && (
              <div className="sticky bottom-0 border-t border-border bg-surface p-4">
                <button
                  type="button"
                  onClick={handleMarkContacted}
                  disabled={savingFooter}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {savingFooter ? "שומר..." : "סמן כ'צור קשר'"}
                </button>
              </div>
            )}

            {(showConvert || localLead.businessName) && (
              <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface p-4">
                {showConvert && (
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(true)}
                    className="btn-primary flex-1"
                  >
                    <Check size={16} /> המר ללקוח
                  </button>
                )}
                {localLead.businessName && (
                  <button
                    type="button"
                    onClick={() => setShowSiteModal(true)}
                    className="btn-outline flex-1"
                  >
                    <Globe size={16} /> צור אתר ללקוח
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showConvertModal && localLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-modal-title"
            className="panel w-full max-w-sm p-5 shadow-xl"
          >
            <h3 id="convert-modal-title" className="mb-4 text-lg font-black text-foreground">
              המרה ללקוח
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 text-muted">כמה גביתם על הקמה? (Setup Fee)</span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-muted font-mono">₪</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={setupFee}
                    onChange={(e) => setSetupFee(e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-base font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 text-muted">כמה גביתם בחודש? (Monthly)</span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-muted font-mono">₪</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={monthlyRetainer}
                    onChange={(e) => setMonthlyRetainer(e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-base font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                disabled={convertSaving}
                className="btn-outline disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConvertConfirm}
                disabled={convertSaving}
                className="btn-primary disabled:opacity-50"
              >
                <Check size={16} /> {convertSaving ? "שומר..." : "אשר"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSiteModal && localLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-modal-title"
            className="panel w-full max-w-sm p-5 shadow-xl"
          >
            <h3 id="site-modal-title" className="mb-4 text-lg font-black text-foreground">
              יצירת אתר מהליד
            </h3>

            {siteResultUrl ? (
              <>
                <p className="text-sm text-foreground">
                  ✅ נוצר:{" "}
                  <a
                    href={siteResultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-accent underline"
                  >
                    {siteResultUrl}
                  </a>
                </p>

                {siteDeployStatus === "deploying" && (
                  <p className="mt-2 text-sm text-muted">⏳ האתר בתהליך פריסה ל-Vercel...</p>
                )}

                {siteDeployStatus === "ready" && siteLiveUrl && (
                  <p className="mt-2 text-sm text-foreground">
                    🚀 האתר באוויר:{" "}
                    <a
                      href={siteLiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-accent underline"
                    >
                      {siteLiveUrl}
                    </a>
                  </p>
                )}

                {siteDeployStatus === "timeout" && (
                  <p className="mt-2 text-sm text-warn">
                    הפריסה עדיין מתבצעת — בדוק שוב בעוד כמה דקות (אפשר גם ב-Vercel דשבורד).
                  </p>
                )}

                {siteDeployStatus === "error" && siteError && (
                  <p className="mt-2 text-sm text-warn">{siteError}</p>
                )}

                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={closeSiteModal} className="btn-primary">
                    סגור
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "landing", label: "דף נחיתה" },
                        { value: "booking", label: "הזמנת תורים" },
                        { value: "payments", label: "תשלומים" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSiteCategory(option.value)}
                        disabled={siteSaving}
                        aria-pressed={siteCategory === option.value}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                          siteCategory === option.value
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-surface-2 text-foreground hover:border-accent"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {(siteCategory === "booking" || siteCategory === "payments") && (
                    <p className="text-xs text-muted">
                      ⚠ אתרי הזמנת תורים/תשלומים חדשים יותר וייתכן שיידרש תיקון ידני
                      אחרי היצירה.
                    </p>
                  )}
                  {siteError && (
                    <p className="text-sm text-warn">
                      {siteError}
                      {sitePartialRepoUrl && (
                        <>
                          {" "}
                          הריפו נוצר אך שמירת הקבצים נכשלה — סיימו ידנית ב-
                          <a
                            href={sitePartialRepoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-accent underline"
                          >
                            {sitePartialRepoUrl}
                          </a>
                          .
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeSiteModal}
                    disabled={siteSaving}
                    className="btn-outline disabled:opacity-50"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateSiteConfirm}
                    disabled={siteSaving}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Check size={16} /> {siteSaving ? "שומר..." : "אשר"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
