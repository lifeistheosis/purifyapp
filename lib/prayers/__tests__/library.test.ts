import { describe, expect, it } from "vitest";

import { listHours } from "@/lib/prayers/hours";
import { RULE_FILES, libraryRule, libraryRules } from "@/lib/prayers/library";
import { readerRules } from "@/lib/prayers/rules";

/**
 * The prayer book the builder of Your rule offers (1.7): every rule with
 * words of its own and every Hour, each with its prayers, so nothing a
 * reader can open in Prayers is missing from what they can add.
 */

describe("the prayer book for Your rule", () => {
  it("brings in every rule file the registry points at", () => {
    const files = readerRules().map((r) => r.file!).sort();
    expect(Object.keys(RULE_FILES).sort()).toEqual(files);
  });

  it("offers every rule and every Hour, once each, with their prayers", () => {
    const rules = libraryRules("en");
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const meta of readerRules()) expect(ids, meta.id).toContain(meta.id);
    for (const h of listHours()) expect(ids, h.slug).toContain(h.slug);
    for (const r of rules) {
      expect(r.rule.prayers.length, r.id).toBeGreaterThan(0);
      for (const p of r.rule.prayers) expect(p.id, `${r.id}/${p.id}`).toMatch(/^[a-z0-9-]{1,80}$/);
    }
    expect(rules.filter((r) => r.group === "hours").map((r) => r.id)).toEqual(listHours().map((h) => h.slug));
  });

  it("gives a German reader the German wording where a rule has one, with the same prayers", () => {
    const en = libraryRule("morning", "en")!;
    const de = libraryRule("morning", "de")!;
    expect(de.title).not.toBe(en.title);
    expect(de.prayers.map((p) => p.id)).toEqual(en.prayers.map((p) => p.id));
    expect(libraryRules("de").find((r) => r.id === "morning")?.lang).toBe("de");
    // A rule with no German file stays English.
    expect(libraryRule("protection", "de")).toBe(libraryRule("protection", "en"));
  });
});
