/**
 * A work's parts as its reader names them (1.8, round 6, the owner's pick A
 * of r3-29, "As the Bible reads", his note 79). Each chapter is a page, as a
 * chapter of the Bible is: the work's larger part large where the book's name
 * stands ("Conference 1", "Book 8", "Homily 15"), the chapter under it with
 * the chevron that opens the contents ("Chapter 1"), and the chapter's own
 * title in italic where the Bible shows a named passage. The pill, the
 * running line over it and the contents say the same names, so a part has
 * one name everywhere: build 86 said "All 603 chapters" at the top and
 * "Section 1 of 603" at the foot.
 *
 * The names come from the edition's own divisions (lib/saints/divisions.ts):
 *
 *   two levels      Conference 1 / Chapter 1 (the Conferences, the Institutes,
 *                   On the Incarnation, the Harmony, the Exact Exposition):
 *                   the larger part large, the chapter under it; the contents
 *                   are the larger parts as rows, each opening its chapters
 *                   as a grid, and the parts the edition leaves out stand in
 *                   their place as "Not in this edition" (the Conferences'
 *                   12 and 22, the Institutes' Book 6).
 *   one level, large  Homily 15, Sermon 21, Book I, Discourse II, Codex 6:
 *                   the part large, the work's title under it.
 *   one level, chapters  a work read by its chapters (the Life of Hilarion,
 *                   an epistle of St Ignatius, St Basil on the Holy Spirit):
 *                   the work's title large, "Chapter 3" under it.
 *   by their titles  where a work's titles number it and no scheme does
 *                   (St Gregory's orations, "Chapter 1"; St Ephraim's
 *                   "Hymn I"; St Cyprian's "Epistle LXIX"), the same, read
 *                   from the titles.
 *   no numbers      a section of our own or a free title ("The call: flee,
 *                   keep silence", "Preface", "Salutation"): its title large,
 *                   the work's title under it.
 *
 * The names are said in the reader's language (reading.part.*, with the
 * numbers as the edition prints them, Roman where it does); the titles stay
 * in the work's English, as the text does. Pure, with no imports but types,
 * so its test can hold every work in the library.
 */

import type { WorkDivisions } from "./divisions";

/** The names a part can have, each a string reading.part.<level> in every language. */
export const PART_LEVELS = ["book", "chapter", "conference", "homily", "sermon", "discourse", "part", "codex", "hymn", "letter"] as const;
export type PartLevel = (typeof PART_LEVELS)[number];

/** A part's name: its level and number, said in the reader's language, or a section's own words. */
export type PartName = { level: PartLevel; n: number; roman?: true } | { text: string };

/** How one section's page is headed and counted. */
export type SectionHead = {
  /** The section's own number in the file (Section.n): its address, #sN. */
  n: number;
  /** The large name: "Conference 1", "Homily 15", the work's title, a free title. */
  name: PartName;
  /** Under it, with the chevron to the contents: "Chapter 1", or the work's title. Null for a work of one section. */
  sub: PartName | null;
  /** The chapter's own title, in italic. */
  caption: string | null;
  /** The pill's name ("Conference 10 · 10"): the larger part, and the chapter's number in it. */
  pill: { name: PartName; inner?: number };
  /** The larger part it is a chapter of, for the contents ("conference:10"); null in a work of one level. */
  group: string | null;
  /** "Chapter 10 of 14": the name it is counted by and how many there are. Null where its parts are not numbered. */
  count: { name: PartName; total: number } | null;
};

/** One entry of a work's contents, in order. */
export type ContentsEntry =
  /** A larger part, opening its chapters as a grid; or one the edition leaves out. */
  | { kind: "group"; key: string; name: PartName; sections: { n: number; label: number }[]; omitted?: true }
  /** A work of one level: its parts as a grid. */
  | { kind: "grid"; sections: { n: number; label: number }[] }
  /** A section by its own title: front matter, or a work whose parts are not numbered. */
  | { kind: "row"; n: number; title: string };

type SectionLike = { n: number; title: string };

/** "XXI" to 21, "21" to 21. */
function num(s: string): number {
  if (/^\d+$/.test(s)) return Number(s);
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  const up = s.toUpperCase();
  for (let k = 0; k < up.length; k++) {
    const a = v[up[k]] ?? 0;
    const b = v[up[k + 1]] ?? 0;
    total += a < b ? -a : a;
  }
  return total;
}

/** The dashes that may stand after a title's numbering (a codex of Photius), as codes: no dash is typed here. */
const DASHES = String.fromCharCode(0x2014, 0x2013);
/** The numbering a title opens with ("Conference 1, Chapter 2.", "Homily 15,", "Book I, Chapter III."), and its rest. */
const NUMBERING = new RegExp(
  `^(?:Book|Conference|Sermon|Homily|Chapter|Discourse|Part|Codex|Hymn|Epistle|Letter) [0-9IVXLC]+(?:, Chapter [0-9IVXLC]+)?(?=$|[\\s.,:;${DASHES}-])[.,:;]?`,
);
/** What stands between the numbering and the title's own words. */
const LEADING = new RegExp(`^[\\s.,:;${DASHES}-]+`);

/** A title's own words after its numbering: "Of our stay in Scete ...", "Matthew 5:1, 2", "on Job 1". */
export function captionOf(title: string): string | null {
  const m = NUMBERING.exec(title.trim());
  const rest = (m ? title.trim().slice(m[0].length) : "").replace(LEADING, "").trim();
  return rest ? rest : null;
}

/** Large units, each read whole: a part of these is named large, the work's title under it. */
const LARGE: ReadonlySet<string> = new Set(["book", "conference", "homily", "sermon", "discourse", "part", "codex", "hymn", "letter"]);

/** A title's own numbering, where the work's scheme does not give one: "Chapter 1", "Hymn IV", "Epistle LXIX. To Quintus". */
const BY_TITLE = /^(Chapter|Hymn|Homily|Sermon|Book|Part|Discourse|Epistle|Letter) ([0-9]+|[IVXLC]+)\b/;

function levelOfWord(word: string): PartLevel {
  const w = word.toLowerCase();
  return w === "epistle" ? "letter" : (w as PartLevel);
}

/**
 * How each section of a work is headed and counted, and the work's contents.
 * `divisions` is the work's own (divisionsOf), or null where it keeps none.
 */
export function partsOf(
  sections: readonly SectionLike[],
  divisions: Pick<WorkDivisions, "levels" | "titled" | "places" | "scheme"> | null,
  workTitle: string,
): { heads: SectionHead[]; contents: ContentsEntry[] } {
  const free = (s: SectionLike): SectionHead => ({
    n: s.n,
    name: { text: s.title },
    sub: sections.length > 1 ? { text: workTitle } : null,
    caption: null,
    pill: { name: { text: s.title } },
    group: null,
    count: null,
  });

  // A work of one section is one page: its title, and nothing to choose.
  if (sections.length === 1) {
    const s = sections[0];
    return {
      heads: [{ n: s.n, name: { text: workTitle }, sub: null, caption: s.title === workTitle ? null : s.title, pill: { name: { text: workTitle } }, group: null, count: null }],
      contents: [],
    };
  }

  // The numbers each section is titled by: the scheme's, else the titles' own.
  type Numbered = { levels: PartLevel[]; path: number[]; roman: boolean[] };
  const numbered: (Numbered | null)[] = sections.map(() => null);
  const titled = divisions?.titled ?? 0;
  if (divisions && titled > 0) {
    const levels = divisions.levels.slice(0, titled).map((l) => (l === "section" ? "part" : l)) as PartLevel[];
    const roman = levels.map((_, k) => Boolean(divisions.scheme.roman?.[k]));
    sections.forEach((s, i) => {
      const first = divisions.places[i]?.find((p) => p);
      if (first) numbered[i] = { levels, path: first.path.slice(0, titled), roman };
    });
  } else {
    const parsed = sections.map((s) => BY_TITLE.exec(s.title.trim()));
    const words = new Set(parsed.filter(Boolean).map((m) => levelOfWord(m![1])));
    const nums = parsed.filter(Boolean).map((m) => num(m![2]));
    // Read from the titles only where they number the work once each, in order.
    const once = nums.every((v, k) => k === 0 || v > nums[k - 1]);
    if (words.size === 1 && nums.length >= 2 && once) {
      const [level] = [...words];
      sections.forEach((s, i) => {
        const m = parsed[i];
        if (m) numbered[i] = { levels: [level], path: [num(m[2])], roman: [/^[IVXLC]+$/.test(m[2])] };
      });
    }
  }

  const named = (level: PartLevel, n: number, roman: boolean): PartName => (roman ? { level, n, roman: true } : { level, n });
  const anyNumbered = numbered.some(Boolean);
  if (!anyNumbered) {
    return { heads: sections.map(free), contents: sections.map((s) => ({ kind: "row" as const, n: s.n, title: s.title })) };
  }

  const two = numbered.some((x) => x && x.path.length >= 2);
  const heads: SectionHead[] = [];
  const contents: ContentsEntry[] = [];
  if (two) {
    // The larger parts in order, each with its chapters.
    const groups = new Map<string, { name: PartName; outer: number; sections: { n: number; label: number }[] }>();
    sections.forEach((s, i) => {
      const x = numbered[i];
      if (!x || x.path.length < 2) {
        heads.push(free(s));
        contents.push({ kind: "row", n: s.n, title: s.title });
        return;
      }
      const key = `${x.levels[0]}:${x.path[0]}`;
      const outer = named(x.levels[0], x.path[0], x.roman[0]);
      let g = groups.get(key);
      if (!g) {
        g = { name: outer, outer: x.path[0], sections: [] };
        groups.set(key, g);
        contents.push({ kind: "group", key, name: outer, sections: g.sections });
      }
      g.sections.push({ n: s.n, label: x.path[1] });
      heads.push({
        n: s.n,
        name: outer,
        sub: named(x.levels[1], x.path[1], x.roman[1]),
        caption: captionOf(s.title),
        pill: { name: outer, inner: x.path[1] },
        group: key,
        count: null,
      });
    });
    // Each chapter counted among its part's.
    for (const h of heads) {
      if (!h.group || !h.sub) continue;
      h.count = { name: h.sub, total: groups.get(h.group)!.sections.length };
    }
    // The larger parts the edition leaves out, where they would stand: a gap
    // in the numbers (the Conferences' 12 and 22), not past the last.
    const level = numbered.find((x) => x && x.path.length >= 2)!.levels[0];
    const roman = numbered.find((x) => x && x.path.length >= 2)!.roman[0];
    const present = [...groups.values()].map((g) => g.outer);
    const out: ContentsEntry[] = [];
    let prev: number | null = null;
    for (const e of contents) {
      if (e.kind === "group") {
        const at = groups.get(e.key)!.outer;
        if (prev !== null) for (let k = prev + 1; k < at; k++) if (!present.includes(k)) out.push({ kind: "group", key: `${level}:${k}`, name: named(level, k, roman), sections: [], omitted: true });
        prev = at;
      }
      out.push(e);
    }
    return { heads, contents: out };
  }

  // One level: large units each named large; chapters under the work's title.
  // A run of numbered parts is one grid; a section by its own title between
  // them (St Cyril's fragments on Luke) stands as a row where it falls.
  let grid: { n: number; label: number }[] | null = null;
  const total = numbered.filter(Boolean).length;
  sections.forEach((s, i) => {
    const x = numbered[i];
    if (!x) {
      heads.push(free(s));
      contents.push({ kind: "row", n: s.n, title: s.title });
      grid = null;
      return;
    }
    const part = named(x.levels[0], x.path[0], x.roman[0]);
    const large = LARGE.has(x.levels[0]);
    // A title of our own after the numbers (St Ignatius's "Praise of the
    // Ephesians", read in order), else the words after the numbering.
    const caption = BY_TITLE.test(s.title) || NUMBERING.test(s.title) || /^\d+$/.test(s.title.trim()) ? captionOf(s.title) : s.title;
    heads.push({
      n: s.n,
      name: large ? part : { text: workTitle },
      sub: large ? { text: workTitle } : part,
      caption,
      pill: { name: part },
      group: null,
      count: { name: part, total },
    });
    if (!grid) {
      grid = [];
      contents.push({ kind: "grid", sections: grid });
    }
    grid.push({ n: s.n, label: x.path[0] });
  });
  return { heads, contents };
}

/** The section before and after, in the work's order. */
export function neighbours(heads: readonly SectionHead[], n: number): { prev: SectionHead | null; next: SectionHead | null } {
  const i = heads.findIndex((h) => h.n === n);
  return { prev: i > 0 ? heads[i - 1] : null, next: i >= 0 && i < heads.length - 1 ? heads[i + 1] : null };
}

/** A part's name for the eye: Roman where the edition prints it so. */
/**
 * How much of a part's name the pill can show (the arbiter, 2026-11-11, on
 * checkMock's cut rule: "The pill shows what fits whole (the chapter's
 * number, or its short form where the edition gives one), and the sheet that
 * opens shows the full names"). The pill tries 0, then 1, then 2, for the
 * whole work at once, until no name of the work is cut
 * (components/saints/MobileWorkPill.tsx measures it):
 *   0  the name as the reading room keeps it: "Conference 10 · 10", a
 *      chapter's own title, the work's title for a work of one section;
 *   1  a part named by its own words becomes "Part 3", by its place in the
 *      work; a numbered part keeps its name;
 *   2  a numbered part keeps its numbers only, as the edition prints them:
 *      "10 · 10", "XVIII", "141".
 * The pill never names a part otherwise than its heading does (the arbiter,
 * 2026-11-11, after the stills: a heading of "Codex 1" over a pill of
 * "Part 2" told the reader two things at once): a part the edition numbers
 * keeps its own number at every level, and only a part named by its own
 * words goes by its place. The full names stay in the contents sheet and in
 * what the pill says to a screen reader.
 */
export type PillLevel = 0 | 1 | 2;

/** A part's name in the pill at a level; `index` is its place among the work's parts, from 0. */
export function pillAt(head: SectionHead, index: number, level: PillLevel): SectionHead["pill"] {
  if (level === 0) return head.pill;
  const { name, inner } = head.pill;
  if ("text" in name) return { name: { level: "part", n: index + 1 } };
  if (level === 1) return head.pill;
  return { name: { text: inner !== undefined ? `${numberShown(name)} \u00b7 ${inner}` : numberShown(name) } };
}

export function numberShown(name: { n: number; roman?: true }): string {
  if (!name.roman) return String(name.n);
  const table: [number, string][] = [[100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let left = name.n;
  for (const [v, s] of table) while (left >= v) { out += s; left -= v; }
  return out;
}
