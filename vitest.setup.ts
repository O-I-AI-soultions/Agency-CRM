import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Most components under test call `useRouter()` from `next/navigation` (e.g.
// StatusActionButtons calls `router.refresh()`). Provide a lightweight mock
// so component tests don't need an AppRouterContext provider.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// jsdom does not implement the Pointer Events capture API used by
// LeadCard's drag-and-drop handlers, nor `document.elementFromPoint`.
// Provide no-op/overridable stubs so pointer-event-driven tests don't throw.
if (!("setPointerCapture" in HTMLElement.prototype)) {
  HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!("releasePointerCapture" in HTMLElement.prototype)) {
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}
if (!("hasPointerCapture" in HTMLElement.prototype)) {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
}
if (!("elementFromPoint" in document)) {
  document.elementFromPoint = vi.fn(() => null);
}
