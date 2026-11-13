import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * "Learn how to pray it", the way from the prayer of the heart to its lesson
 * (Prayers, on a phone and on a computer). Its words carried a typed arrow in
 * every catalogue, "→" even in Urdu, which reads from the right (round 2's
 * before export, 2026-11-13: docs/1.9-build/redesign/round-2/found.txt). A
 * typed glyph is not an icon: it does not mirror, it takes the words' size
 * and colour, and a screen reader says it. The pill is the house's quick way
 * in (Graphite's PILL), and its siblings, the quick ways in under Prayers'
 * title, carry no arrow: the words are the link.
 */

const ROOT = process.cwd();
const DIR = path.join(ROOT, "lib/i18n/messages");
const ARROWS = /[→←↗↘›‹»«➔➜⟶⟵]/;

describe("Learn how to pray it", () => {
  const catalogs = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));

  it("is read in every catalogue", () => {
    expect(catalogs.length).toBeGreaterThanOrEqual(21);
  });

  for (const file of catalogs) {
    it(`${file}: its words carry no typed arrow`, () => {
      const said = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as Record<string, string>;
      const words = said["ui.learnHowToPrayIt"];
      expect(words, "the line is there").toBeTruthy();
      expect(words).not.toMatch(ARROWS);
      expect(words, "no space left where the arrow stood").toBe(words.trim());
    });
  }

  it("stands alone in its pill, no glyph typed beside it, on a phone and on a computer", () => {
    for (const rel of ["components/mobile/PrayersMobile.tsx", "app/(app)/prayers/page.tsx"]) {
      const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
      const at = code.indexOf('<T k="ui.learnHowToPrayIt" />');
      expect(at, rel).toBeGreaterThan(-1);
      const link = code.slice(code.lastIndexOf("<Link", at), code.indexOf("</Link>", at));
      expect(link, rel).toContain('href="/prayers/learning/jesus-prayer"');
      expect(link, rel).toMatch(/className=\{(?:cn\()?PILL\b/);
      expect(link, rel).not.toMatch(ARROWS);
    }
  });
});
