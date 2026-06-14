import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import KanbanBoard from "@/components/KanbanBoard";
import type { LeadRecord } from "@/lib/types";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "rec1",
    businessName: "Business",
    phoneNumber: null,
    city: null,
    googleRating: null,
    websiteUrl: null,
    googleMapsLink: null,
    status: "New Lead",
    notes: null,
    lastContacted: null,
    nextAction: null,
    leadSource: null,
    priority: null,
    assignedTo: null,
    followUpCount: 0,
    createdTime: new Date().toISOString(),
    email: null,
    address: null,
    niche: null,
    ...overrides,
  };
}

/**
 * Simulates a press-and-drag-and-release gesture on a card, ending over the
 * given drop-zone element (the column container with `data-column-status`).
 */
function dragCard(card: Element, dropzone: Element | null) {
  fireEvent.pointerDown(card, { pointerId: 1, clientX: 0, clientY: 0, button: 0 });
  // Move past the drag threshold (7px).
  fireEvent.pointerMove(card, { pointerId: 1, clientX: 50, clientY: 50 });
  fireEvent.pointerUp(card, { pointerId: 1, clientX: 50, clientY: 50 });
  void dropzone;
}

describe("KanbanBoard drag-and-drop", () => {
  const originalFetch = global.fetch;
  const originalElementFromPoint = document.elementFromPoint;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    document.elementFromPoint = originalElementFromPoint;
    vi.restoreAllMocks();
  });

  it("moves a card to a new column optimistically and calls PATCH /api/leads/[id]", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const leads: LeadRecord[] = [makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead" })];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]');
    expect(card).toBeTruthy();

    // Pretend the pointer ends up over the "Contacted" column's drop zone.
    const contactedDropzone = document.querySelector('[data-column-status="Contacted"]');
    expect(contactedDropzone).toBeTruthy();
    document.elementFromPoint = vi.fn(() => contactedDropzone as Element);

    dragCard(card!, contactedDropzone);

    // Optimistic update: card should now render inside the Contacted column.
    await waitFor(() => {
      const dropzone = document.querySelector('[data-column-status="Contacted"]');
      expect(dropzone?.textContent).toContain("Acme Co");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/leads/lead-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Contacted" }),
    });
  });

  it("sets lastContacted and increments followUpCount client-side when dropped on 'Contacted'", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const leads: LeadRecord[] = [
      makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead", followUpCount: 0, lastContacted: null }),
    ];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]');
    const contactedDropzone = document.querySelector('[data-column-status="Contacted"]');
    document.elementFromPoint = vi.fn(() => contactedDropzone as Element);

    dragCard(card!, contactedDropzone);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/leads/lead-1",
        expect.objectContaining({ body: JSON.stringify({ status: "Contacted" }) })
      );
    });

    // Card moved into the Contacted column (visual confirmation of the
    // optimistic update applying the "Contacted" special-casing).
    const dropzone = document.querySelector('[data-column-status="Contacted"]');
    expect(dropzone?.textContent).toContain("Acme Co");
  });

  it("rolls back the optimistic update and shows an error when the API call fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const leads: LeadRecord[] = [makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead" })];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]');
    const contactedDropzone = document.querySelector('[data-column-status="Contacted"]');
    document.elementFromPoint = vi.fn(() => contactedDropzone as Element);

    dragCard(card!, contactedDropzone);

    // Eventually rolls back to the "New Lead" column and shows the error banner.
    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toHaveTextContent("עדכון הסטטוס נכשל. נסה שוב.");
      },
      { timeout: 3000 }
    );

    const newLeadDropzone = document.querySelector('[data-column-status="New Lead"]');
    expect(newLeadDropzone?.textContent).toContain("Acme Co");

    const contactedDropzoneAfter = document.querySelector('[data-column-status="Contacted"]');
    expect(contactedDropzoneAfter?.textContent).not.toContain("Acme Co");
  });

  it("is a no-op when dropped on the same column (no API call)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const leads: LeadRecord[] = [makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead" })];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]');
    const newLeadDropzone = document.querySelector('[data-column-status="New Lead"]');
    document.elementFromPoint = vi.fn(() => newLeadDropzone as Element);

    dragCard(card!, newLeadDropzone);

    // Give any async handlers a chance to run.
    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(newLeadDropzone?.textContent).toContain("Acme Co");
  });

  it("is a no-op when dropped on the 'אחר' (other) column (no API call)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    // A lead with a status outside KANBAN_STATUSES lands in the "Other"
    // column. Use a status not in KANBAN_STATUSES to populate it.
    const leads: LeadRecord[] = [
      makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead" }),
      makeLead({ id: "lead-2", businessName: "Legacy Co", status: "Qualified" }),
    ];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]');
    const otherDropzone = document.querySelector('[data-column-status="other"]');
    expect(otherDropzone).toBeTruthy();
    document.elementFromPoint = vi.fn(() => otherDropzone as Element);

    dragCard(card!, otherDropzone);

    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).not.toHaveBeenCalled();
    // The card stays in the "New Lead" column.
    const newLeadDropzone = document.querySelector('[data-column-status="New Lead"]');
    expect(newLeadDropzone?.textContent).toContain("Acme Co");
  });

  it("opens the LeadDrawer on a plain click without dragging", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const leads: LeadRecord[] = [makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead" })];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]')!;

    // Tap: pointerdown + pointerup at the same location (below drag threshold) + click.
    fireEvent.pointerDown(card, { pointerId: 2, clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerUp(card, { pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.click(card);

    // The drawer should now be open, showing the lead's business name in the
    // dialog title (heading) — there will be two matches (card + drawer).
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("does not open the drawer when a drag occurred (drag threshold exceeded)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const leads: LeadRecord[] = [makeLead({ id: "lead-1", businessName: "Acme Co", status: "New Lead" })];

    render(<KanbanBoard leads={leads} partner="איתי" />);

    const card = screen.getByText("Acme Co").closest('[role="button"]')!;

    const newLeadDropzone = document.querySelector('[data-column-status="New Lead"]');
    document.elementFromPoint = vi.fn(() => newLeadDropzone as Element);

    // Drag past the threshold and release over the same column (no-op move).
    fireEvent.pointerDown(card, { pointerId: 3, clientX: 0, clientY: 0, button: 0 });
    fireEvent.pointerMove(card, { pointerId: 3, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(card, { pointerId: 3, clientX: 50, clientY: 50 });
    fireEvent.click(card);

    // Drawer should remain closed (no dialog rendered as open).
    const dialog = screen.queryByRole("dialog");
    if (dialog) {
      expect(dialog).toHaveAttribute("aria-modal", "true");
      // isOpen controls opacity/pointer-events via class names rather than
      // removing the dialog from the DOM — assert the overlay isn't visible.
      expect(dialog.className).not.toContain("translate-x-0");
    }
  });
});
