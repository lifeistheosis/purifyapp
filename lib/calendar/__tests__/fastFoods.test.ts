import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import { fastingStatus, type FastKind } from "../orthodox";
import { fastNotAllowedKey } from "../fastFoods";

// The catalog is flat: one dotted key per line.
const english = (key: string): string | undefined => (en as Record<string, string>)[key];

describe("what a fast day leaves out", () => {
  it("says it only where the rule line does not already", () => {
    expect(fastNotAllowedKey("wine-oil")).toBe("calendar.fast.not.wineOil");
    expect(fastNotAllowedKey("fish")).toBe("calendar.fast.not.fish");
    expect(fastNotAllowedKey("fast")).toBe("calendar.fast.not.fast");
    for (const kind of ["strict", "fast-free", "normal"] as FastKind[]) expect(fastNotAllowedKey(kind)).toBeNull();
  });

  it("has English words for every line it can return", () => {
    for (const kind of ["wine-oil", "fish", "fast"] as FastKind[]) {
      const key = fastNotAllowedKey(kind)!;
      expect(english(key), key).toMatch(/^No /);
    }
    // Eggs are named with the dairy, and fish only where fish is not allowed.
    expect(english("calendar.fast.not.wineOil")).toContain("eggs");
    expect(english("calendar.fast.not.wineOil")).toContain("fish");
    expect(english("calendar.fast.not.fish")).not.toContain("fish");
  });

  it("never contradicts a day's own rule line, across two years", () => {
    // Every rule line that says what is allowed gets a line saying what is
    // not, and the two never name the same food.
    const start = Date.UTC(2026, 0, 1);
    for (let d = 0; d < 730; d++) {
      const day = new Date(start + d * 86_400_000 + 12 * 3_600_000);
      const fast = fastingStatus(day, "new");
      const key = fastNotAllowedKey(fast.kind);
      const rule = english(`calendar.fast.${fast.ruleId}.rule`) ?? "";
      if (fast.kind === "strict") expect(rule, fast.ruleId).toMatch(/No meat/);
      if (!key) continue;
      const not = english(key)!.toLowerCase();
      for (const food of ["fish", "wine", "oil"]) {
        if (new RegExp(`${food}[^.]*allowed`, "i").test(rule)) expect(not, `${fast.ruleId}: ${food}`).not.toContain(food);
      }
    }
  });
});
