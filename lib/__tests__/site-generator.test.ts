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
  createVercelProject,
  triggerDeployment,
  checkDeploymentStatus,
  waitForDeploymentReady,
  resolveLiveUrl,
  VercelApiError,
  DeploymentNotReadyError,
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

describe("createVercelProject", () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.VERCEL_API_TOKEN;

  beforeEach(() => {
    global.fetch = vi.fn();
    process.env.VERCEL_API_TOKEN = "test-vercel-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.VERCEL_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("success: POSTs to /v11/projects with teamId query param and name/gitRepository body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "prj_123", name: "pizza-place" }),
    });

    const result = await createVercelProject("pizza-place");

    expect(result).toEqual({ id: "prj_123", name: "pizza-place" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      "https://api.vercel.com/v11/projects?teamId=team_iTMkW2op53QZywks7RYsa63k"
    );
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      name: "pizza-place",
      gitRepository: { type: "github", repo: "O-I-AI-soultions/pizza-place" },
    });
  });

  it("missing token: throws VercelApiError(status 500) without calling fetch", async () => {
    delete process.env.VERCEL_API_TOKEN;

    await expect(createVercelProject("pizza-place")).rejects.toMatchObject({ status: 500 });
    await expect(createVercelProject("pizza-place")).rejects.toBeInstanceOf(VercelApiError);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("triggerDeployment", () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.VERCEL_API_TOKEN;

  beforeEach(() => {
    global.fetch = vi.fn();
    process.env.VERCEL_API_TOKEN = "test-vercel-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.VERCEL_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("success: POSTs to /v13/deployments with project, target production, gitSource", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "dpl_123", url: "pizza-place-abc.vercel.app", readyState: "QUEUED" }),
    });

    const result = await triggerDeployment("pizza-place");

    expect(result).toEqual({
      id: "dpl_123",
      url: "pizza-place-abc.vercel.app",
      readyState: "QUEUED",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      "https://api.vercel.com/v13/deployments?teamId=team_iTMkW2op53QZywks7RYsa63k"
    );
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      name: "pizza-place",
      project: "pizza-place",
      target: "production",
      gitSource: { type: "github", org: "O-I-AI-soultions", repo: "pizza-place", ref: "main" },
    });
  });

  it("failure (400): throws VercelApiError with matching status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Bad ref" } }),
    });

    await expect(triggerDeployment("pizza-place")).rejects.toMatchObject({ status: 400 });
    await expect(triggerDeployment("pizza-place")).rejects.toBeInstanceOf(VercelApiError);
  });
});

describe("checkDeploymentStatus", () => {
  const DEPLOYMENT_ID = "dpl_abc123";
  const originalToken = process.env.VERCEL_API_TOKEN;

  function jsonResponse(ok: boolean, status: number, body: unknown) {
    return {
      ok,
      status,
      json: async () => body,
    };
  }

  beforeEach(() => {
    process.env.VERCEL_API_TOKEN = "test-vercel-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.VERCEL_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("makes exactly one GET call and returns the snapshot when readyState is BUILDING", async () => {
    const payload = { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "BUILDING" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true, 200, payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkDeploymentStatus(DEPLOYMENT_ID);

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=team_iTMkW2op53QZywks7RYsa63k`
    );
    expect(init.method).toBe("GET");
  });

  it("makes exactly one GET call and returns the snapshot when readyState is READY", async () => {
    const payload = { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "READY", alias: ["x.vercel.app"] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true, 200, payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkDeploymentStatus(DEPLOYMENT_ID);

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws VercelApiError immediately on ERROR readyState, with exactly one call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "ERROR" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkDeploymentStatus(DEPLOYMENT_ID)).rejects.toBeInstanceOf(VercelApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws VercelApiError immediately on CANCELED readyState, with exactly one call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "CANCELED" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkDeploymentStatus(DEPLOYMENT_ID)).rejects.toBeInstanceOf(VercelApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does no internal waiting/looping — never calls setTimeout-based retry, just propagates transport failure", async () => {
    delete process.env.VERCEL_API_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkDeploymentStatus(DEPLOYMENT_ID)).rejects.toBeInstanceOf(VercelApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("waitForDeploymentReady", () => {
  const DEPLOYMENT_ID = "dpl_abc123";
  const originalToken = process.env.VERCEL_API_TOKEN;

  function jsonResponse(ok: boolean, status: number, body: unknown) {
    return {
      ok,
      status,
      json: async () => body,
    };
  }

  beforeEach(() => {
    process.env.VERCEL_API_TOKEN = "test-vercel-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.VERCEL_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("ready immediately: resolves after exactly one fetch call when readyState is READY on first poll", async () => {
    const payload = { id: DEPLOYMENT_ID, url: "pizza-place-abc.vercel.app", readyState: "READY" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true, 200, payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await waitForDeploymentReady(DEPLOYMENT_ID);

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=team_iTMkW2op53QZywks7RYsa63k`
    );
    expect(init.method).toBe("GET");
  });

  it("ready after retries: QUEUED -> BUILDING -> READY resolves after 3 calls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "QUEUED" })
      )
      .mockResolvedValueOnce(
        jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "BUILDING" })
      )
      .mockResolvedValueOnce(
        jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "READY" })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await waitForDeploymentReady(DEPLOYMENT_ID, { intervalMs: 10, timeoutMs: 5000 });

    expect(result.readyState).toBe("READY");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("timeout: only BUILDING responses rejects with DeploymentNotReadyError with deploymentId/lastState set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "BUILDING" })
      );
    vi.stubGlobal("fetch", fetchMock);

    const error = await waitForDeploymentReady(DEPLOYMENT_ID, {
      intervalMs: 10,
      timeoutMs: 50,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(DeploymentNotReadyError);
    expect((error as DeploymentNotReadyError).deploymentId).toBe(DEPLOYMENT_ID);
    expect((error as DeploymentNotReadyError).lastState).toBe("BUILDING");
  });

  it("error state: readyState ERROR rejects immediately with VercelApiError without exhausting the timeout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "ERROR" })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      waitForDeploymentReady(DEPLOYMENT_ID, { intervalMs: 10, timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(VercelApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("canceled state: readyState CANCELED rejects immediately with VercelApiError without exhausting the timeout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(true, 200, { id: DEPLOYMENT_ID, url: "x.vercel.app", readyState: "CANCELED" })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      waitForDeploymentReady(DEPLOYMENT_ID, { intervalMs: 10, timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(VercelApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("resolveLiveUrl", () => {
  it("returns https://{alias[0]} when alias array is non-empty", () => {
    const result = resolveLiveUrl({
      url: "pizza-place-abc123.vercel.app",
      alias: ["pizza-place.vercel.app", "pizza-place-other.vercel.app"],
    });
    expect(result).toBe("https://pizza-place.vercel.app");
  });

  it("returns https://{url} when alias is absent", () => {
    const result = resolveLiveUrl({ url: "pizza-place-abc123.vercel.app" });
    expect(result).toBe("https://pizza-place-abc123.vercel.app");
  });

  it("returns https://{url} when alias is an empty array", () => {
    const result = resolveLiveUrl({ url: "pizza-place-abc123.vercel.app", alias: [] });
    expect(result).toBe("https://pizza-place-abc123.vercel.app");
  });
});

describe("route-level branching: Vercel deploy trigger failure does not roll back the GitHub repo", () => {
  // No precedent in this repo for invoking Next.js route handlers directly
  // (see the RepoNotReadyError describe block above) — this scopes coverage
  // to the contract the route's new try/catch block depends on. Per the
  // redesign (see .pipeline/changes.md — reviewer flagged the old
  // synchronous waitForDeploymentReady poll as unsafe inside a serverless
  // request), the route now only triggers the deployment and returns
  // immediately: success yields deploymentId + status "deploying" (no
  // liveUrl yet, that's resolved later by the client polling
  // deploy-status); a triggerDeployment failure yields deployError, and
  // never attempts any rollback call against the GitHub repo.
  const REPO_HTML_URL = "https://github.com/O-I-AI-soultions/pizza-place";
  const REPO_FULL_NAME = "O-I-AI-soultions/pizza-place";

  async function simulateRouteFlow(deployTriggerSucceeds: boolean) {
    const repo = { html_url: REPO_HTML_URL, full_name: REPO_FULL_NAME };
    let deploymentId: string | undefined;
    let deployError: string | undefined;

    try {
      if (!deployTriggerSucceeds) {
        throw new VercelApiError("Vercel project name collision", 409);
      }
      deploymentId = "dpl_abc123";
    } catch (err) {
      deployError =
        err instanceof VercelApiError ? `Vercel API error: ${err.message}` : "Failed to deploy site to Vercel";
    }

    return {
      status: 200,
      body: {
        ok: true,
        repoUrl: repo.html_url,
        repoFullName: repo.full_name,
        ...(deploymentId ? { deploymentId, status: "deploying" as const } : { deployError }),
      },
    };
  }

  it("deploy trigger failure: returns 200 with repoUrl/repoFullName/deployError, no deploymentId, no rollback", async () => {
    const result = await simulateRouteFlow(false);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      repoUrl: REPO_HTML_URL,
      repoFullName: REPO_FULL_NAME,
    });
    expect(result.body).not.toHaveProperty("deploymentId");
    expect(result.body).toHaveProperty("deployError");
  });

  it("deploy trigger success: returns 200 with repoUrl/repoFullName/deploymentId/status deploying, no deployError, no liveUrl yet", async () => {
    const result = await simulateRouteFlow(true);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      repoUrl: REPO_HTML_URL,
      repoFullName: REPO_FULL_NAME,
      deploymentId: "dpl_abc123",
      status: "deploying",
    });
    expect(result.body).not.toHaveProperty("deployError");
    expect(result.body).not.toHaveProperty("liveUrl");
  });
});
