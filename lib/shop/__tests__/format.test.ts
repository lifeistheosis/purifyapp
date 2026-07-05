import { describe, expect, it } from "vitest";

import {
  CLASSIFICATION_LABELS,
  dispatchWindowLabel,
  formatPrice,
  purchasable,
} from "../format";

describe("formatPrice", () => {
  it("drops cents for whole-dollar prices", () => {
    expect(formatPrice(4900)).toBe("$49");
    expect(formatPrice(12500)).toBe("$125");
  });

  it("keeps cents when present", () => {
    expect(formatPrice(4950)).toBe("$49.50");
    expect(formatPrice(999)).toBe("$9.99");
  });
});

describe("dispatchWindowLabel", () => {
  it("uses business days for short windows", () => {
    expect(dispatchWindowLabel(1, 2)).toBe("Dispatches in 1–2 business days");
    expect(dispatchWindowLabel(1, 1)).toBe("Dispatches in 1 business day");
    expect(dispatchWindowLabel(3, 5)).toBe("Dispatches in 3–5 business days");
  });

  it("reads long special-order windows in weeks", () => {
    expect(dispatchWindowLabel(14, 28)).toBe("Dispatches in 2–4 weeks");
    expect(dispatchWindowLabel(21, 21)).toBe("Dispatches in 3 weeks");
  });
});

describe("classification honesty", () => {
  it("never offers hand-painted / original / handmade labels", () => {
    const labels = Object.values(CLASSIFICATION_LABELS).join(" ").toLowerCase();
    expect(labels).not.toContain("hand-painted");
    expect(labels).not.toContain("hand painted");
    expect(labels).not.toContain("original");
    expect(labels).not.toContain("handmade");
  });
});

describe("purchasable", () => {
  it("allows ready_to_ship and special_order only", () => {
    expect(purchasable("ready_to_ship")).toBe(true);
    expect(purchasable("special_order")).toBe(true);
    expect(purchasable("coming_soon")).toBe(false);
    expect(purchasable("out_of_stock")).toBe(false);
  });
});
