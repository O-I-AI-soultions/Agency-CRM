import { describe, it, expect, vi } from "vitest";

// `lib/airtable.ts` imports "server-only", which throws when loaded outside
// a server context. The vitest environment is jsdom (client-like), so stub
// it out as a no-op for this test.
vi.mock("server-only", () => ({}));

// `lib/airtable.ts` throws at module load time if these env vars are
// missing. Vitest (unlike Next.js) doesn't auto-load .env.local, so stub
// them with dummy values purely to satisfy the module's load-time check —
// no real credentials are used or needed since the Airtable SDK itself is
// mocked below.
vi.stubEnv("AIRTABLE_API_KEY", "test-key");
vi.stubEnv("AIRTABLE_BASE_ID", "test-base-id");

// Mock the `airtable` package so the underlying `base()` call throws,
// simulating a Notes-table schema problem (missing table/fields).
vi.mock("airtable", () => {
  class MockAirtable {
    base() {
      return () => {
        throw new Error("Notes table not found");
      };
    }
  }
  return { default: MockAirtable };
});

describe("getPartnerNoteSafe", () => {
  it("resolves to null instead of rejecting when the underlying Airtable call throws", async () => {
    const { getPartnerNoteSafe } = await import("@/lib/airtable");

    const result = await getPartnerNoteSafe("איתי");

    expect(result).toBeNull();
  });

  it("logs the error via console.error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getPartnerNoteSafe } = await import("@/lib/airtable");
    await getPartnerNoteSafe("עמרי");

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
