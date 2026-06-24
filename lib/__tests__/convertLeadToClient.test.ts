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

// Mock the `airtable` package so that the Clients-table `create()` succeeds
// but the Lead-Tracker `update()` (Status -> Converted) throws, simulating
// the Airtable "Status" single-select not having a "Converted" option
// configured yet.
vi.mock("airtable", () => {
  class MockAirtable {
    base() {
      return (tableName: string) => ({
        create: async () => {
          if (tableName === "Clients") {
            return { id: "rec_client_123" };
          }
          throw new Error(`Unexpected create() call on table "${tableName}"`);
        },
        update: async () => {
          if (tableName === "Lead Tracker") {
            throw new Error('Insufficient permissions or invalid option "Converted"');
          }
          return { id: "rec_unexpected" };
        },
      });
    }
  }
  return { default: MockAirtable };
});

describe("convertLeadToClient", () => {
  it("resolves to { clientCreated: true, leadStatusUpdated: false } when the Lead Tracker Status update throws", async () => {
    const { convertLeadToClient } = await import("@/lib/airtable");

    const result = await convertLeadToClient("lead123", {
      businessName: "Acme Co",
      setupFee: 2000,
      monthlyRetainer: 200,
    });

    expect(result).toEqual({ clientCreated: true, leadStatusUpdated: false });
  });

  it("logs the error via console.error instead of throwing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { convertLeadToClient } = await import("@/lib/airtable");
    await convertLeadToClient("lead456", {
      businessName: "Beta Inc",
      setupFee: 1500,
      monthlyRetainer: 150,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "convertLeadToClient: failed to update lead status to Converted",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});
