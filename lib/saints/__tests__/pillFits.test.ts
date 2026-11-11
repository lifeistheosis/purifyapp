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
import { partsOf, pillAt, type SectionHead } from "@/lib/saints/parts";
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

  it("says the full names to a screen reader, whatever it shows", () => {
    expect(src).toContain('aria-label={t("bible.pickChapterCurrentAria", { book: pill(head), chapter: "" }).trim()}');
    expect(src).toContain('t("bible.previousTargetAria", { book: pill(prev), chapter: "" })');
    expect(src).toContain('t("bible.nextTargetAria", { book: pill(next), chapter: "" })');
  });
});
