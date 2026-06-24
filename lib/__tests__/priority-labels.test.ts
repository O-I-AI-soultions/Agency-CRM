import { describe, expect, it } from "vitest";
import { PRIORITIES } from "@/lib/types";
import { PRIORITY_LABELS, PRIORITY_CLASSES, PRIORITY_ICONS } from "@/lib/priority-labels";

describe("priority-labels", () => {
  it("has a label, class, and icon for every Priority union member", () => {
    for (const priority of PRIORITIES) {
      expect(PRIORITY_LABELS[priority]).toBeTruthy();
      expect(PRIORITY_CLASSES[priority]).toBeTruthy();
      expect(PRIORITY_ICONS[priority]).toBeTruthy();
    }
  });

  it("defines exactly the High/Medium/Low levels", () => {
    expect(Object.keys(PRIORITY_LABELS).sort()).toEqual([...PRIORITIES].sort());
    expect(Object.keys(PRIORITY_CLASSES).sort()).toEqual([...PRIORITIES].sort());
    expect(Object.keys(PRIORITY_ICONS).sort()).toEqual([...PRIORITIES].sort());
  });
});
