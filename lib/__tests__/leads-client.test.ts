import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateLeadStatusClient } from "@/lib/leads-client";

describe("updateLeadStatusClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls PATCH /api/leads/[id] with the correct body and returns true on success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const result = await updateLeadStatusClient("lead123", "Contacted");

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("/api/leads/lead123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Contacted" }),
    });
  });

  it("returns false when the response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const result = await updateLeadStatusClient("lead123", "Not Interested");

    expect(result).toBe(false);
  });

  it("returns false when fetch throws (network error)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const result = await updateLeadStatusClient("lead123", "Pitch Sent");

    expect(result).toBe(false);
  });
});
