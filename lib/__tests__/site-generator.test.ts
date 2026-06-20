import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  leadToRawJson,
  buildSiteGenerationPlan,
  buildClientJsContent,
  createRepoFromTemplate,
  putRepoFile,
  waitForRepoReady,
  GitHubApiError,
  RepoNotReadyError,
} from "@/lib/site-generator";
import type { LeadRecord } from "@/lib/types";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "rec1",
    businessName: "Test Business",
    phoneNumber: null,
    city: null,
    googleRating: null,
    websiteUrl: null,
    googleMapsLink: null,
    status: null,
    notes: null,
    lastContacted: null,
    nextAction: null,
    leadSource: null,
    priority: null,
    assignedTo: null,
    followUpCount: null,
    createdTime: new Date().toISOString(),
    email: null,
    address: null,
    niche: null,
    ...overrides,
  };
}

describe("leadToRawJson", () => {
  it("maps a full LeadRecord into the expected business sub-object shape", () => {
    const lead = makeLead({
      businessName: "Pizza Place",
      niche: "מסעדות",
      phoneNumber: "0501234567",
      email: "pizza@example.com",
      address: "Dizengoff 1",
      city: "תל אביב",
      websiteUrl: "https://old-site.example.com",
      googleRating: 4.8,
      googleMapsLink: "https://maps.example.com/pizza",
    });

    const result = leadToRawJson(lead, "landing");

    expect(result).toEqual({
      business: {
        name: "Pizza Place",
        category: "מסעדות",
        phone: "0501234567",
        email: "pizza@example.com",
        address: "Dizengoff 1",
        website: "https://old-site.example.com",
        photo: "",
        rating: 4.8,
        reviewCount: undefined,
        openingHours: [],
        googleMapsUrl: "https://maps.example.com/pizza",
      },
      meta: { template: "landing" },
    });
  });

  it("maps a minimal/mostly-null LeadRecord without throwing, with empty-string/array fallbacks", () => {
    const lead = makeLead({ businessName: "Minimal Co" });

    expect(() => leadToRawJson(lead, "booking")).not.toThrow();
    const result = leadToRawJson(lead, "booking");

    expect(result).toEqual({
      business: {
        name: "Minimal Co",
        category: "Local Business",
        phone: "",
        email: "",
        address: "",
        website: "",
        photo: "",
        rating: undefined,
        reviewCount: undefined,
        openingHours: [],
        googleMapsUrl: "",
      },
      meta: { template: "booking" },
    });
  });

  it("falls back to city when address is missing", () => {
    const lead = makeLead({ businessName: "City Fallback Co", city: "חיפה" });
    const result = leadToRawJson(lead, "landing");
    expect(result.business.address).toBe("חיפה");
  });
});

describe("buildSiteGenerationPlan", () => {
  it('category "landing" -> shape "landing", templateRepo "template-landing-page"', () => {
    const lead = makeLead({ businessName: "Landing Co" });
    const plan = buildSiteGenerationPlan(lead, "landing");

    expect(plan.shape).toBe("landing");
    expect(plan.templateRepo).toBe("template-landing-page");
    expect(plan.repoName).toBeTruthy();
    expect(typeof plan.repoName).toBe("string");
  });

  it('category "booking" -> shape "booking", templateRepo "template-booking"', () => {
    const lead = makeLead({ businessName: "Booking Co" });
    const plan = buildSiteGenerationPlan(lead, "booking");

    expect(plan.shape).toBe("booking");
    expect(plan.templateRepo).toBe("template-booking");
  });

  it('category "payments" -> shape "booking" (reuse), templateRepo "template-booking"', () => {
    const lead = makeLead({ businessName: "Payments Co" });
    const plan = buildSiteGenerationPlan(lead, "payments");

    expect(plan.shape).toBe("booking");
    expect(plan.templateRepo).toBe("template-booking");
  });

  it("produces a repoName for business names with Hebrew/special characters/spaces", () => {
    const lead = makeLead({ businessName: "פיצה ושמח! @123" });
    const plan = buildSiteGenerationPlan(lead, "landing");

    expect(plan.repoName).toBeTruthy();
    expect(typeof plan.repoName).toBe("string");
    // delegate to template-shared's slugify — just assert it's used and
    // produces a URL/repo-name-safe string, not re-testing slugify itself.
    expect(plan.repoName).not.toMatch(/[\s!@]/);
  });
});

describe("buildClientJsContent", () => {
  it("output starts with `window.CLIENT_DATA = ` and round-trips via JSON.parse", () => {
    const clientData = { hello: "world", nested: { a: 1, b: [1, 2, 3] } };
    const content = buildClientJsContent(clientData);

    expect(content).toContain("window.CLIENT_DATA = ");
    expect(content.trim().endsWith(";")).toBe(true);

    const start = content.indexOf("window.CLIENT_DATA = ") + "window.CLIENT_DATA = ".length;
    const end = content.lastIndexOf(";");
    const jsonSubstring = content.slice(start, end);

    expect(JSON.parse(jsonSubstring)).toEqual(clientData);
  });
});

describe("createRepoFromTemplate", () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.GITHUB_API_TOKEN;

  beforeEach(() => {
    global.fetch = vi.fn();
    process.env.GITHUB_API_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GITHUB_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("success: posts to the generate endpoint with owner/name/private in the body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        html_url: "https://github.com/O-I-AI-soultions/pizza-place",
        full_name: "O-I-AI-soultions/pizza-place",
      }),
    });

    const result = await createRepoFromTemplate("template-landing-page", "pizza-place");

    expect(result).toEqual({
      html_url: "https://github.com/O-I-AI-soultions/pizza-place",
      full_name: "O-I-AI-soultions/pizza-place",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/O-I-AI-soultions/template-landing-page/generate"
    );
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      owner: "O-I-AI-soultions",
      name: "pizza-place",
      private: true,
    });
  });

  it("failure (422 collision): throws GitHubApiError with status 422", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers(),
      json: async () => ({ message: "name already exists on this account" }),
    });

    await expect(createRepoFromTemplate("template-booking", "taken-name")).rejects.toMatchObject({
      status: 422,
    });
    await expect(createRepoFromTemplate("template-booking", "taken-name")).rejects.toBeInstanceOf(
      GitHubApiError
    );
  });

  it("missing token: throws GitHubApiError with status 500, without calling fetch", async () => {
    delete process.env.GITHUB_API_TOKEN;

    await expect(createRepoFromTemplate("template-booking", "no-token")).rejects.toMatchObject({
      status: 500,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("putRepoFile", () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.GITHUB_API_TOKEN;

  beforeEach(() => {
    process.env.GITHUB_API_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GITHUB_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("file exists (GET returns 200 with sha): PUT body includes that sha", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sha: "abc123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    global.fetch = fetchMock;

    await putRepoFile("O-I-AI-soultions/pizza-place", "client.json", '{"a":1}', "Update config");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const putCall = fetchMock.mock.calls[1];
    expect(putCall[1].method).toBe("PUT");
    const putBody = JSON.parse(putCall[1].body as string);
    expect(putBody.sha).toBe("abc123");
  });

  it("file doesn't exist (GET returns 404): PUT body has no sha key", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: "Not Found" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    global.fetch = fetchMock;

    await putRepoFile("O-I-AI-soultions/pizza-place", "client.json", '{"a":1}', "Create config");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const putCall = fetchMock.mock.calls[1];
    const putBody = JSON.parse(putCall[1].body as string);
    expect("sha" in putBody).toBe(false);
  });

  it("base64-encodes the content correctly in the PUT body", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: "Not Found" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    global.fetch = fetchMock;

    const content = "window.CLIENT_DATA = { hello: 'world' };";
    await putRepoFile("O-I-AI-soultions/pizza-place", "client.js", content, "Update client.js");

    const putCall = fetchMock.mock.calls[1];
    const putBody = JSON.parse(putCall[1].body as string);
    expect(Buffer.from(putBody.content, "base64").toString("utf8")).toBe(content);
  });

  it("rethrows non-404 GET errors instead of treating them as create", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ message: "Internal Server Error" }),
    });
    global.fetch = fetchMock;

    await expect(
      putRepoFile("O-I-AI-soultions/pizza-place", "client.json", "{}", "msg")
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("waitForRepoReady", () => {
  const REPO_FULL_NAME = "O-I-AI-soultions/MB-barbershop";
  const originalToken = process.env.GITHUB_API_TOKEN;

  function jsonResponse(status: number, body: unknown = {}) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(),
      json: async () => body,
    };
  }

  beforeEach(() => {
    process.env.GITHUB_API_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GITHUB_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("ready immediately: resolves after exactly one fetch call when client.json is already 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { sha: "abc" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(waitForRepoReady(REPO_FULL_NAME)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.github.com/repos/${REPO_FULL_NAME}/contents/client.json`
    );
    expect(init.method).toBe("GET");
  });

  it("ready after retries: resolves once a later call returns 200, after the expected number of fetch calls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }))
      .mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }))
      .mockResolvedValueOnce(jsonResponse(200, { sha: "abc" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      waitForRepoReady(REPO_FULL_NAME, { intervalMs: 10, timeoutMs: 5000 })
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("timeout: rejects with RepoNotReadyError once timeoutMs elapses with only 404 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { message: "Not Found" }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await waitForRepoReady(REPO_FULL_NAME, {
      intervalMs: 10,
      timeoutMs: 50,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(RepoNotReadyError);
    expect((error as RepoNotReadyError).repoFullName).toBe(REPO_FULL_NAME);
  });

  it("propagates non-404 errors (e.g. rate limit) immediately, without exhausting the timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(403, { message: "rate limited" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      waitForRepoReady(REPO_FULL_NAME, { intervalMs: 10, timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(GitHubApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("route-level branching: RepoNotReadyError short-circuits before putRepoFile", () => {
  // No precedent in this repo for invoking Next.js route handlers directly
  // in lib/__tests__ (no existing app/**/route.test.ts), so per the spec's
  // fallback this scopes coverage to the contract the route's new catch
  // branch depends on: when waitForRepoReady rejects with
  // RepoNotReadyError, a caller following the route's try/catch/return
  // pattern (see app/api/leads/[id]/generate-site/route.ts) never reaches
  // putRepoFile, and surfaces a 502 with partialRepoUrl set.
  const REPO_FULL_NAME = "O-I-AI-soultions/MB-barbershop";
  const originalToken = process.env.GITHUB_API_TOKEN;

  beforeEach(() => {
    process.env.GITHUB_API_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GITHUB_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("never calls putRepoFile and returns 502 + partialRepoUrl when waitForRepoReady throws RepoNotReadyError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({ message: "Not Found" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const putRepoFileSpy = vi.fn(putRepoFile);

    async function simulateRouteFlow() {
      try {
        await waitForRepoReady(REPO_FULL_NAME, { intervalMs: 10, timeoutMs: 30 });
      } catch (err) {
        if (err instanceof RepoNotReadyError) {
          return {
            status: 502,
            body: {
              error: "הריפו נוצר אך עדיין לא מוכן לכתיבה, נסה שוב בעוד כמה רגעים",
              partialRepoUrl: `https://github.com/${REPO_FULL_NAME}`,
            },
          };
        }
        throw err;
      }
      await putRepoFileSpy(REPO_FULL_NAME, "client.json", "{}", "msg");
      return { status: 200, body: { ok: true } };
    }

    const result = await simulateRouteFlow();

    expect(result.status).toBe(502);
    expect(result.body).toHaveProperty("partialRepoUrl");
    expect(putRepoFileSpy).not.toHaveBeenCalled();
  });
});
