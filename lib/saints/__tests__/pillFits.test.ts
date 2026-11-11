// A Father's work's pill shows every name whole (the arbiter, 2026-11-11, on
// checkMock's cut rule, which found "The unusually short chain of tes..." in
// the pill of St Ignatius's Life). The pill's name has 96px on a phone 320
// wide and 166px at 390. About 147 works put a chapter's own title or the
// work's title there, and at 320 even "Conference 10 · 10" (131px) was cut.
// So the pill measures its names and steps down, for the whole work at once,
// until none is cut (components/saints/MobileWorkPill.tsx): the names as the
// reading room keeps them, then "Part 3" for a chapter's own title, then a
// numbered name's numbers alone. The full names stay in the contents the name
// opens and in what the pill says to a screen reader. The export walk,
// scripts/work-pill-walk.mjs, holds it at 320 and 390.
//
// What would go wrong if this broke: a chapter's name cut at its end, which a
// reader cannot finish and checkMock fails.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { divisionsOf } from "@/lib/saints/divisions";
import { numberShown, partsOf, pillAt, type PillLevel, type SectionHead } from "@/lib/saints/parts";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** Every work's heads, as the reader makes them. */
function everyWork(): { key: string; heads: SectionHead[] }[] {
  const out: { key: string; heads: SectionHead[] }[] = [];
  for (const s of SAINTS) {
    for (const w of s.works) {
      const key = `${s.slug}/${w.slug}`;
      const file = path.join(ROOT, "data", "saints", `${key}.json`);
      if (!fs.existsSync(file)) continue;
      const work = JSON.parse(fs.readFileSync(file, "utf8"));
      out.push({ key, heads: partsOf(work.sections, divisionsOf(key, work), work.title).heads });
    }
  }
  return out;
}

const WORKS = everyWork();
const byKey = (key: string) => WORKS.find((w) => w.key === key)!.heads;

describe("a part's name in the pill", () => {
  it("is the name as the work keeps it at the first level, for every part of every work", () => {
    expect(WORKS.length).toBeGreaterThan(200);
    for (const { heads } of WORKS) heads.forEach((h, i) => expect(pillAt(h, i, 0)).toBe(h.pill));
  });

  it("becomes Part 1, 2, 3 by its place where it is a chapter's own title or the work's, at the second", () => {
    const life = byKey("ignatius-of-antioch/life-of-ignatius");
    expect(life.map((h) => h.pill.name)).toEqual(life.map(() => ({ text: expect.any(String) })));
    expect(life.map((h, i) => pillAt(h, i, 1))).toEqual([1, 2, 3, 4].map((n) => ({ name: { level: "part", n } })));
    // A numbered name stays as it is.
    const conferences = byKey("john-cassian/conferences");
    const second = conferences.find((h) => h.pill.inner !== undefined)!;
    expect(pillAt(second, conferences.indexOf(second), 1)).toBe(second.pill);
  });

  it("keeps a numbered name's numbers alone at the third, as the edition prints them", () => {
    const conferences = byKey("john-cassian/conferences");
    const h = conferences.find((x) => x.pill.inner !== undefined)!;
    const shown = pillAt(h, conferences.indexOf(h), 2).name;
    expect(shown).toEqual({ text: `${"n" in h.pill.name ? h.pill.name.n : ""} \u00b7 ${h.pill.inner}` });
    const hymns = byKey("ephraim-the-syrian/hymns-on-the-nativity");
    const roman = hymns.find((x) => "roman" in x.pill.name)!;
    expect(pillAt(roman, hymns.indexOf(roman), 2).name).toEqual({ text: expect.stringMatching(/^[IVXLC]+$/) });
    // A chapter's own title stays "Part n".
    const life = byKey("ignatius-of-antioch/life-of-ignatius");
    expect(pillAt(life[2], 2, 2)).toEqual({ name: { level: "part", n: 3 } });
  });

  it("is short at the last level in every work of the library, so a phone of 320 has room for it", () => {
    // 96px at 15px semibold holds about eleven of these characters; the walk measures the real ones.
    let longest = "";
    for (const { heads } of WORKS) {
      heads.forEach((h, i) => {
        const p = pillAt(h, i, 2);
        const said = "text" in p.name ? p.name.text : `Part ${p.name.n}`;
        if (said.length > longest.length) longest = said;
      });
    }
    expect(longest.length, longest).toBeLessThanOrEqual(11);
  });

  // The arbiter, 2026-11-11, after the stills of Photius's Bibliotheca: a heading of "Codex 1"
  // over a pill of "Part 2" told the reader two things at once (a ruling of the same day had made
  // every part of a work go by its place once any did, and was reversed). A part the edition
  // numbers keeps its own number in the pill at every level, as its heading has it; only a part
  // named by its own words takes "Part n", by its place.
  it("never names a part otherwise than its heading does: a numbered part keeps its own number at every level", () => {
    let numbered = 0;
    for (const { key, heads } of WORKS) {
      heads.forEach((h, i) => {
        const { name, inner } = h.pill;
        for (const level of [1, 2] as PillLevel[]) {
          const shown = pillAt(h, i, level);
          const where = `${key}, part ${i + 1}, at level ${level}`;
          if ("text" in name) {
            expect(shown, where).toEqual({ name: { level: "part", n: i + 1 } });
            continue;
          }
          numbered++;
          // Its own name as the work keeps it, or its own numbers alone; never its place.
          if (level === 1) expect(shown, where).toBe(h.pill);
          else expect(shown, where).toEqual({ name: { text: inner !== undefined ? `${numberShown(name)} \u00b7 ${inner}` : numberShown(name) } });
        }
      });
    }
    expect(numbered).toBeGreaterThan(1000);
    // The Bibliotheca itself: "Codex 1", its second part, is "Codex 1" and then "1" in the pill, never "Part 2".
    const photius = byKey("photius-the-great/the-bibliotheca");
    const at = photius.findIndex((h, i) => !("text" in h.pill.name) && h.pill.name.n !== i + 1);
    const codex = photius[at];
    expect(codex.pill.name).toEqual({ level: "codex", n: 1 });
    expect(pillAt(codex, at, 1)).toBe(codex.pill);
    expect(pillAt(codex, at, 2)).toEqual({ name: { text: "1" } });
    // Its titled first part, Photius's letter to his brother, goes by its place.
    expect(pillAt(photius[0], 0, 1)).toEqual({ name: { level: "part", n: 1 } });
  });
});

describe("the pill", () => {
  const src = fs.readFileSync(path.join(ROOT, "components", "saints", "MobileWorkPill.tsx"), "utf8");

  it("measures its names before the frame is painted and steps down while one is cut, for the whole work", () => {
    expect(src).toContain("const names = heads.map((h, i) => sayPill(pillAt(h, i, level)));");
    expect(src).toContain("const cut = Array.from(box.children).some((el) => el.scrollWidth > el.clientWidth + 0.5);");
    expect(src).toContain("if (cut) setLevel((l) => (l < 2 ? ((l + 1) as PillLevel) : l));");
    expect(src).toContain("const useIsoLayoutEffect = typeof window !== \"undefined\" ? useLayoutEffect : useEffect;");
    expect(src).toMatch(/<span ref=\{namesBox\} data-pill-level=\{level\} className="grid min-w-0 justify-items-center">/);
  });

  it("starts again for another work, another language, a turned screen or the font arriving", () => {
    expect(src).toContain("const full = heads.map(pill).join(\"\\n\");");
    expect(src).toMatch(/if \(measuredFor !== full\) \{\s*setMeasuredFor\(full\);\s*setLevel\(0\);/);
    expect(src).toContain('window.addEventListener("resize", again);');
    expect(src).toContain("document.fonts.ready.then(again)");
  });

  // Four Lives failed checkMock's cut rule, "Ecclesi..." (Fable voices, 2026-11-11): a name that
  // fitted wide stayed cut once the screen narrowed, since setting the level to 0 where it stood
  // at 0 changed nothing and the measure never ran again. Each turn and the font now count.
  it("measures again on every turn and font, even where its names already stood whole", () => {
    expect(src).toMatch(/const again = \(\) => \{\s*if \(!live\) return;\s*setLevel\(0\);\s*setMeasures\(\(m\) => m \+ 1\);\s*\};/);
    expect(src).toContain("}, [level, full, measures]);");
  });

  it("says the full names to a screen reader, whatever it shows", () => {
    expect(src).toContain('aria-label={t("bible.pickChapterCurrentAria", { book: pill(head), chapter: "" }).trim()}');
    expect(src).toContain('t("bible.previousTargetAria", { book: pill(prev), chapter: "" })');
    expect(src).toContain('t("bible.nextTargetAria", { book: pill(next), chapter: "" })');
  });
});
