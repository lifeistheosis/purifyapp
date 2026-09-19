import { describe, expect, it } from "vitest";

import { edgeEnabled, filterItems, fold, placeMenu, stepEnabled, typeahead } from "../listbox";

const items = [
  { label: "Christ" },
  { label: "Saints" },
  { label: "Sealed", disabled: true },
  { label: "Sets & Collections" },
  { label: "🧢 Apparel", hint: "Beanies, patches" },
];

describe("stepEnabled", () => {
  it("skips disabled rows", () => {
    expect(stepEnabled(items, 1, 1)).toBe(3);
    expect(stepEnabled(items, 3, -1)).toBe(1);
  });

  it("clamps at both ends instead of wrapping", () => {
    expect(stepEnabled(items, 4, 1)).toBe(4);
    expect(stepEnabled(items, 0, -1)).toBe(0);
  });

  it("enters from nothing active", () => {
    expect(stepEnabled(items, -1, 1)).toBe(0);
    expect(stepEnabled(items, -1, -1)).toBe(4);
  });

  it("moves a page at a time and stops at the edge", () => {
    expect(stepEnabled(items, 0, 10)).toBe(4);
    expect(stepEnabled(items, 4, -10)).toBe(0);
  });

  it("answers -1 when nothing can be chosen", () => {
    expect(stepEnabled([{ label: "a", disabled: true }], -1, 1)).toBe(-1);
    expect(edgeEnabled([], "first")).toBe(-1);
  });
});

describe("typeahead", () => {
  it("finds the first match after the active row", () => {
    expect(typeahead(items, "s", -1)).toBe(1);
    expect(typeahead(items, "s", 1)).toBe(3);
  });

  it("cycles on a repeated letter and never lands on a disabled row", () => {
    expect(typeahead(items, "ss", 3)).toBe(1);
    expect(typeahead(items, "sea", -1)).toBe(-1);
  });

  it("reads past a leading emoji", () => {
    expect(typeahead(items, "app", -1)).toBe(4);
  });

  it("ignores case and accents", () => {
    expect(fold("Théotokos")).toBe("theotokos");
    expect(typeahead([{ label: "Théotokos" }], "THEO", -1)).toBe(0);
  });
});

describe("filterItems", () => {
  it("matches label or hint, and keeps everything for an empty query", () => {
    expect(filterItems(items, "beanie").map((i) => i.label)).toEqual(["🧢 Apparel"]);
    expect(filterItems(items, "  ")).toHaveLength(items.length);
  });
});

describe("placeMenu", () => {
  const viewport = { width: 400, height: 800 };

  it("opens below with the trigger's width by default", () => {
    const p = placeMenu({ trigger: { top: 100, bottom: 140, left: 20, width: 200 }, viewport, want: 300 });
    expect(p.side).toBe("below");
    expect(p.top).toBe(146);
    expect(p.width).toBe(200);
    expect(p.maxHeight).toBe(300);
  });

  it("flips above only when below is short and above has more room", () => {
    const low = placeMenu({ trigger: { top: 700, bottom: 740, left: 20, width: 200 }, viewport, want: 300 });
    expect(low.side).toBe("above");
    expect(low.bottom).toBe(106);
    const mid = placeMenu({ trigger: { top: 300, bottom: 340, left: 20, width: 200 }, viewport, want: 300 });
    expect(mid.side).toBe("below");
  });

  it("keeps a wide menu inside the viewport", () => {
    const p = placeMenu({
      trigger: { top: 100, bottom: 140, left: 300, width: 90 },
      viewport,
      want: 200,
      minWidth: 240,
    });
    expect(p.width).toBe(240);
    expect(p.left + p.width).toBeLessThanOrEqual(viewport.width - 8);
  });

  it("never exceeds the viewport on a phone", () => {
    const p = placeMenu({
      trigger: { top: 100, bottom: 140, left: 16, width: 343 },
      viewport: { width: 375, height: 700 },
      want: 320,
      minWidth: 420,
    });
    expect(p.width).toBe(359);
    expect(p.left).toBe(8);
  });
});
