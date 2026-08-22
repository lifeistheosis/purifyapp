import { describe, expect, it } from "vitest";
import { FOCUSABLE_SELECTOR, nextIndex } from "../focusTrap";

describe("nextIndex", () => {
  it("wraps forward off the end and backward off the front", () => {
    // The whole point of a trap. Off the end must land on the first stop, not
    // on whatever the browser would have picked outside the dialog.
    expect(nextIndex(3, 2, false)).toBe(0);
    expect(nextIndex(3, 0, true)).toBe(2);
  });

  it("steps normally in the middle", () => {
    expect(nextIndex(3, 0, false)).toBe(1);
    expect(nextIndex(3, 2, true)).toBe(1);
  });

  it("enters at the first stop forward and the last backward", () => {
    // current = -1 is the first Tab after the dialog focused its own panel.
    // Shift+Tab from there must go to the LAST stop, which is what keeps the
    // very first keystroke from escaping the dialog.
    expect(nextIndex(4, -1, false)).toBe(0);
    expect(nextIndex(4, -1, true)).toBe(3);
  });

  it("reports nothing to focus when the dialog holds no stops", () => {
    expect(nextIndex(0, -1, false)).toBe(-1);
    expect(nextIndex(0, 2, true)).toBe(-1);
  });

  it("is stable on a single stop", () => {
    // One control means Tab holds still rather than cycling to the page.
    expect(nextIndex(1, 0, false)).toBe(0);
    expect(nextIndex(1, 0, true)).toBe(0);
  });
});

describe("FOCUSABLE_SELECTOR", () => {
  it("excludes tabindex -1, which is how the panel itself is skipped", () => {
    // The dialog panel carries tabIndex={-1} so it can be focused
    // programmatically on open without becoming a tab stop of its own.
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it("excludes disabled controls", () => {
    for (const tag of ["button", "input", "select", "textarea"]) {
      expect(FOCUSABLE_SELECTOR).toContain(`${tag}:not([disabled])`);
    }
  });
});
