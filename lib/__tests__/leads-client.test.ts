import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateLeadStatusClient, generateSiteClient } from "@/lib/leads-client";

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

describe("generateSiteClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts to /api/leads/{id}/generate-site with { category } and returns { ok: true, repoUrl } on success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        repoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
        repoFullName: "O-I-AI-soultions/pizza-place",
      }),
    });

    const result = await generateSiteClient("lead123", "landing");

    expect(result).toEqual({ ok: true, repoUrl: "https://github.com/O-I-AI-soultions/pizza-place" });
    expect(global.fetch).toHaveBeenCalledWith("/api/leads/lead123/generate-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "landing" }),
    });
  });

  it("returns { ok: false, error } passed through from a non-ok response body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "כבר קיים ריפו בשם הזה ב-GitHub" }),
    });

    const result = await generateSiteClient("lead123", "booking");

    expect(result).toEqual({ ok: false, error: "כבר קיים ריפו בשם הזה ב-GitHub" });
  });

  it("returns { ok: false, error, partialRepoUrl } when the non-ok response body includes partialRepoUrl", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "GitHub API error: commit failed",
        partialRepoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
      }),
    });

    const result = await generateSiteClient("lead123", "landing");

    expect(result).toEqual({
      ok: false,
      error: "GitHub API error: commit failed",
      partialRepoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
    });
  });

  it("returns the generic fallback error string when fetch throws (network error)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const result = await generateSiteClient("lead123", "payments");

    expect(result).toEqual({ ok: false, error: "שגיאה ביצירת האתר" });
  });

  it("returns the generic fallback error string when the non-ok response body has no string error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const result = await generateSiteClient("lead123", "landing");

    expect(result).toEqual({ ok: false, error: "שגיאה ביצירת האתר" });
  });
});
