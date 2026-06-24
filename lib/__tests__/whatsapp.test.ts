import { describe, expect, it } from "vitest";
import { toWhatsAppNumber } from "@/lib/whatsapp";

describe("toWhatsAppNumber", () => {
  it("replaces a leading 0 with the 972 country code", () => {
    expect(toWhatsAppNumber("0501234567")).toBe("972501234567");
  });

  it("is idempotent when the number already has the 972 prefix", () => {
    expect(toWhatsAppNumber("972501234567")).toBe("972501234567");
    expect(toWhatsAppNumber("+972-50-123-4567")).toBe("972501234567");
  });

  it("prepends 972 when there is no leading 0 and no existing prefix", () => {
    expect(toWhatsAppNumber("501234567")).toBe("972501234567");
  });

  it("returns an empty string unchanged", () => {
    expect(toWhatsAppNumber("")).toBe("");
  });
});
