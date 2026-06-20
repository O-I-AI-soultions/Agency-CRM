import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateLeadStatusClient, generateSiteClient, checkDeployStatusClient } from "@/lib/leads-client";

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

  it("posts to /api/leads/{id}/generate-site with { category } and returns { ok: true, repoUrl, deploymentId } on success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        repoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
        repoFullName: "O-I-AI-soultions/pizza-place",
        deploymentId: "dpl_abc123",
        status: "deploying",
      }),
    });

    const result = await generateSiteClient("lead123", "landing");

    expect(result).toEqual({
      ok: true,
      repoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
      deploymentId: "dpl_abc123",
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/leads/lead123/generate-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "landing" }),
    });
  });

  it("returns { ok: true, repoUrl, deploymentId: undefined } when the deploy trigger failed (deployError present, no deploymentId)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        repoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
        repoFullName: "O-I-AI-soultions/pizza-place",
        deployError: "Vercel API error: name collision",
      }),
    });

    const result = await generateSiteClient("lead123", "landing");

    expect(result).toEqual({
      ok: true,
      repoUrl: "https://github.com/O-I-AI-soultions/pizza-place",
      deploymentId: undefined,
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

describe("checkDeployStatusClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("GETs /api/leads/{id}/generate-site/deploy-status?deploymentId=... and returns { status: 'building' } for a non-terminal state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "building" }),
    });

    const result = await checkDeployStatusClient("lead123", "dpl_abc123");

    expect(result).toEqual({ status: "building" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/leads/lead123/generate-site/deploy-status?deploymentId=dpl_abc123"
    );
  });

  it("returns { status: 'ready', liveUrl } when the response reports ready with a liveUrl", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", liveUrl: "https://pizza-place.vercel.app" }),
    });

    const result = await checkDeployStatusClient("lead123", "dpl_abc123");

    expect(result).toEqual({ status: "ready", liveUrl: "https://pizza-place.vercel.app" });
  });

  it("returns { status: 'error', error } when the response body reports an error status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "error", error: "Vercel API error: deployment not found" }),
    });

    const result = await checkDeployStatusClient("lead123", "dpl_abc123");

    expect(result).toEqual({ status: "error", error: "Vercel API error: deployment not found" });
  });

  it("returns { status: 'error', error } when the HTTP response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Missing deploymentId" }),
    });

    const result = await checkDeployStatusClient("lead123", "dpl_abc123");

    expect(result).toEqual({ status: "error", error: "Missing deploymentId" });
  });

  it("returns the generic fallback error string when fetch throws (network error)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const result = await checkDeployStatusClient("lead123", "dpl_abc123");

    expect(result).toEqual({ status: "error", error: "שגיאה בבדיקת סטטוס הפריסה" });
  });
});
