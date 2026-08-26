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

  /**
   * A planned row is the ONLY row that cannot explain itself by being opened.
   *
   * PrayerIndexRow's planned branch renders the row dimmed, non-interactive,
   * and tagged "Planned" (components/prayers/PrayerBook.tsx), which is honest
   * about there being nothing to read but says nothing about what is coming.
   * All seven planned entries shipped with no description at all, so the
   * reader met a grey line of text that did not respond to a tap and gave no
   * reason. The description is the whole difference between "not yet" and
   * "broken", and it is the one thing a reader cannot discover for themselves
   * here, because there is no page behind the row to go and look at.
   *
   * Both languages, because the prayers hub is bilingual by construction:
   * RuleMeta carries titleDe/descriptionDe rather than catalog keys, and
   * app/(app)/prayers/page.tsx picks between them on isDe.
   */
  it("every planned rule explains what is coming, in both languages", () => {
    const bare = RULES.filter(
      (r) => r.planned && (!r.description?.trim() || !r.descriptionDe?.trim()),
    ).map((r) => r.id);
    expect(
      bare,
      "These planned rules render a dimmed, untappable row with an empty " +
        "description slot, so the reader gets no reason for it. Add " +
        "description and descriptionDe in lib/prayers/rules.ts:\n  " +
        bare.join("\n  "),
    ).toEqual([]);
  });

  it("a planned description does not promise a specific unsourced service", () => {
    // The editorial rule (docs/editorial-standards.md) is that we never claim
    // a text we have not sourced verbatim. A description is UI copy, not
    // prayer text, but naming a specific service in it would still be a
    // promise about content that does not exist. Describe the occasion, not
    // the document.
    const NAMED_SERVICES =
      /\b(akathist|vespers|matins|orthros|compline|paraklesis|moleben|canon of|divine liturgy)\b/i;
    const offenders = RULES.filter(
      (r) => r.planned && NAMED_SERVICES.test(`${r.description ?? ""} ${r.descriptionDe ?? ""}`),
    ).map((r) => r.id);
    expect(
      offenders,
      "A planned entry names a specific service it has not sourced:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
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
