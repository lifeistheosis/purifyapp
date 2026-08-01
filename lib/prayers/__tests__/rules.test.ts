// Integrity for the prayer rule registry.
//
// Every rule that claims a data file must point at a real JSON file on disk
// that parses to a Rule with at least one prayer, and every prayer must carry
// either a verbatim `text` or one or more jurisdiction `variants` (never an
// empty body). Planned entries must NOT ship a file — they are surfaced
// honestly as "planned", never filled with invented prayers. This keeps the
// "verbatim public-domain only" content rule enforced in CI.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  RULES,
  RULE_CATEGORY_ORDER,
  readerRules,
  planIdParams,
  popularRules,
  indexRules,
  getRuleMeta,
} from "@/lib/prayers/rules";
import type { Rule } from "@/lib/prayers/types";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const PRAYERS_DIR = path.join(ROOT, "data", "prayers");

function loadRule(file: string): Rule {
  const raw = fs.readFileSync(path.join(PRAYERS_DIR, file), "utf8");
  return JSON.parse(raw) as Rule;
}

describe("Prayer rule registry", () => {
  it("rule ids are unique", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("planned rules ship no data file", () => {
    for (const r of RULES) {
      if (r.planned) expect(r.file).toBeUndefined();
    }
  });

  it("every reader rule resolves to a real, well-formed JSON file", () => {
    const rules = readerRules();
    expect(rules.length).toBeGreaterThan(0);
    for (const meta of rules) {
      expect(meta.file).toBeTruthy();
      const full = path.join(PRAYERS_DIR, meta.file!);
      expect(fs.existsSync(full)).toBe(true);
      const rule = loadRule(meta.file!);
      expect(rule.prayers.length).toBeGreaterThan(0);
      for (const p of rule.prayers) {
        const hasText = typeof p.text === "string" && p.text.trim().length > 0;
        const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
        // A prayer must carry a verbatim body, jurisdiction variants, or — for
        // a guided pause like the evening examination — at least an instruction.
        const hasInstruction =
          typeof p.instruction === "string" && p.instruction.trim().length > 0;
        expect(hasText || hasVariants || hasInstruction).toBe(true);
        // Variants must each carry verbatim text plus an attribution.
        for (const v of p.variants ?? []) {
          expect(v.text.trim().length).toBeGreaterThan(0);
          expect(v.jurisdiction.trim().length).toBeGreaterThan(0);
          expect(v.source.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("planIdParams excludes dedicated routes and only lists reader rules", () => {
    const ids = planIdParams().map((p) => p.planId);
    expect(ids).not.toContain("morning");
    expect(ids).not.toContain("evening");
    for (const id of ids) {
      const meta = getRuleMeta(id);
      expect(meta?.file).toBeTruthy();
      expect(meta?.planned).toBeFalsy();
    }
  });

  it("popular rules all exist and are not planned", () => {
    const pop = popularRules();
    expect(pop.length).toBeGreaterThan(0);
    for (const r of pop) {
      expect(getRuleMeta(r.id)).toBeTruthy();
      expect(r.planned).toBeFalsy();
    }
  });

  // Both Prayers surfaces print the popular rail, then every category in
  // full. With no exclusion between the two, seven rules rendered twice on
  // one screen. These pin the invariant that made that possible.
  describe("the index says each rule once", () => {
    const indexed = RULE_CATEGORY_ORDER.flatMap((c) => indexRules(c));

    it("shows nothing the popular rail already showed", () => {
      const popular = new Set(popularRules().map((r) => r.id));
      const repeated = indexed.filter((r) => popular.has(r.id));
      expect(repeated.map((r) => r.id)).toEqual([]);
    });

    it("lists every rule at most once across all categories", () => {
      const ids = indexed.map((r) => r.id);
      expect(ids.length).toBe(new Set(ids).size);
    });

    it("leaves every rule reachable from somewhere on the page", () => {
      // The index, the popular rail, and the two Practices tiles between
      // them must still cover the whole registry: de-duplicating must not
      // silently drop a prayer off the surface.
      const reachable = new Set([
        ...indexed.map((r) => r.id),
        ...popularRules().map((r) => r.id),
        "rope",
        "intercessory",
      ]);
      const missing = RULES.filter((r) => !reachable.has(r.id)).map((r) => r.id);
      expect(missing).toEqual([]);
    });
  });
});
