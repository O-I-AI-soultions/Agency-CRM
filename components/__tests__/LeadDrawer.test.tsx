import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import LeadDrawer from "@/components/LeadDrawer";
import type { LeadRecord } from "@/lib/types";
import * as leadsClient from "@/lib/leads-client";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "rec1",
    businessName: "Business",
    phoneNumber: null,
    city: null,
    googleRating: null,
    websiteUrl: null,
    googleMapsLink: null,
    status: "Pitch Sent",
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

describe("LeadDrawer - deploy-status polling lifecycle", () => {
  beforeEach(() => {
    // shouldAdvanceTime keeps real microtask/promise scheduling working
    // (needed for the mocked async client calls to resolve) while letting us
    // fast-forward the 5s setInterval without a real 20s wait.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stops polling deploy-status once the drawer is closed (lead becomes null), not just on terminal states", async () => {
    const checkDeployStatusClientSpy = vi
      .spyOn(leadsClient, "checkDeployStatusClient")
      .mockResolvedValue({ status: "building" });
    vi.spyOn(leadsClient, "generateSiteClient").mockResolvedValue({
      ok: true,
      repoUrl: "https://github.com/org/repo",
      deploymentId: "dep_123",
    });

    const lead = makeLead();
    const onClose = vi.fn();
    const onUpdate = vi.fn();

    const { rerender } = render(
      <LeadDrawer lead={lead} partner="איתי" onClose={onClose} onUpdate={onUpdate} />
    );

    // Open the "create site" modal and confirm, which triggers
    // generateSiteClient and (since it returns a deploymentId) starts the
    // deploy-status poll via startDeployPolling.
    fireEvent.click(screen.getByRole("button", { name: /צור אתר ללקוח/ }));
    fireEvent.click(screen.getByRole("button", { name: /אשר/ }));

    // Let generateSiteClient's promise resolve and startDeployPolling run.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(leadsClient.generateSiteClient).toHaveBeenCalled();

    // Advance one poll interval — confirms polling actually started.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(checkDeployStatusClientSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Simulate the parent closing the whole drawer: KanbanBoard/UrgentLeadsCard
    // never unmount LeadDrawer, they just set `lead` to null.
    rerender(<LeadDrawer lead={null} partner="איתי" onClose={onClose} onUpdate={onUpdate} />);

    const callsAtClose = checkDeployStatusClientSpy.mock.calls.length;

    // Advance well past several more poll intervals. If the interval were
    // still alive (the bug), this would register more calls.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(checkDeployStatusClientSpy.mock.calls.length).toBe(callsAtClose);
  });
});
