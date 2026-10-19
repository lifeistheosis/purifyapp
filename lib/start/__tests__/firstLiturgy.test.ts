import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { LOCALES } from "@/lib/i18n/locales";
import { planIdParams } from "@/lib/prayers/rules";
import { SAINTS } from "@/lib/saints/saints";
import {
  CHECK_LIST,
  CUSTOMS,
  KINDS,
  KIND_LIST,
  LITURGY_GUIDE_REVIEW,
  NOT_SURE,
  PARTS,
  PART_IDS,
  SOURCES,
  SOURCE_LIST,
  WORDS,
  allLines,
  allQuotes,
  type CustomId,
} from "@/lib/start/firstLiturgy";
import { CHECK_IDS, KIND_IDS } from "@/lib/start/liturgyPlan";

// Your first Liturgy (lib/start/firstLiturgy.ts): the guide as data.
//
// What can go wrong with a guide like this is mostly invisible to a type
// checker: a kind of parish with no customs, a quotation that drifted from
// its source by a word, an em dash, a line that is English in Georgian, a
// Church on the list that is not in communion with the Orthodox Church, a
// door that opens on nothing. Each is held here.

const ROOT = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const catalog = (code: string) => JSON.parse(read("lib", "i18n", "messages", `${code}.json`)) as Record<string, string>;
const EN = catalog("en");
const LINES = allLines();

/** The two dashes the house never writes, by code point. */
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
/** Arrows, checks, crosses, stars and triangles set as characters in place of drawn icons. */
const GLYPHS = new RegExp("[" + [[0x2190, 0x21ff], [0x2713, 0x2715], [0x2726, 0x2726], [0x2605, 0x2606], [0x25b2, 0x25bf]].map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join("") + "]");

/** Catalog keys the guide's screens use that belong to other parts of the app. */
const BORROWED = ["calendar.today", "common.back", "nav.discoverMenu.start", "start.step.cross.title", "start.step.parish.title"];

/** Whether the app has a screen at a path, read off app/ as the router reads it. */
function hasScreen(dir: string, segments: string[]): boolean {
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const groups = folders.filter((n) => n.startsWith("(") && n.endsWith(")"));
  if (groups.some((g) => hasScreen(path.join(dir, g), segments))) return true;
  if (segments.length === 0) return fs.existsSync(path.join(dir, "page.tsx"));
  const [head, ...rest] = segments;
  return folders.some(
    (n) => (n === head || (n.startsWith("[") && !n.startsWith("[..."))) && hasScreen(path.join(dir, n), rest),
  );
}

/** Every door the guide opens inside Purify. */
function doors(): string[] {
  const hrefs = new Set<string>();
  for (const s of SOURCE_LIST) if (s.href) hrefs.add(s.href);
  for (const part of Object.values(PARTS)) for (const item of part.items) if (item.link) hrefs.add(item.link.href);
  const steps = read("components", "start", "liturgy", "GuideSteps.tsx");
  for (const m of steps.matchAll(/href: "(\/[^"]+)"/g)) hrefs.add(m[1]);
  hrefs.add("/start/first-liturgy");
  return [...hrefs];
}

describe("the kinds of church", () => {
  it("are the canonical list, in its order, and Not sure", () => {
    // The jurisdictions of the Assembly of Canonical Orthodox Bishops of the
    // USA, read on 2026-10-16 (SOURCES.assembly), each standing for its
    // tradition, and "Not sure" last.
    expect(KIND_IDS).toEqual([
      "greek",
      "antiochian",
      "oca",
      "russian",
      "serbian",
      "romanian",
      "bulgarian",
      "georgian",
      "ukrainian",
      "carpatho",
      "albanian",
      "unsure",
    ]);
    expect(KIND_LIST.map((k) => k.id)).toEqual(KIND_IDS);
    expect(KINDS.russian.note?.en).toMatch(/ROCOR/);
    expect(KINDS.russian.note?.en).toMatch(/Moscow/);
  });

  it("name no Church that is not in communion with the Orthodox Church", () => {
    const names = KIND_LIST.flatMap((k) => [k.name.en, k.note?.en ?? "", k.see.en]).join(" ");
    for (const word of ["Assyrian", "Coptic", "Armenian", "Ethiopian", "Eritrean", "Syriac", "Malankara", "Oriental", "Tewahedo", "Jacobite"]) {
      expect(names, word).not.toContain(word);
    }
  });

  it("each have customs to show, and every kind of parish but Not sure its languages", () => {
    const known = new Set(Object.keys(CUSTOMS));
    for (const kind of KIND_LIST) {
      expect(kind.customs.length, kind.id).toBeGreaterThanOrEqual(4);
      expect(new Set(kind.customs).size, `${kind.id} repeats a custom`).toBe(kind.customs.length);
      for (const c of kind.customs) expect(known.has(c), `${kind.id}: ${c}`).toBe(true);
      // Seating, head coverings, the evening before and prostrations: the
      // four the owner named, for every kind.
      expect(kind.customs.some((c) => ["pews", "standing", "seatsVary"].includes(c)), `${kind.id} seating`).toBe(true);
      expect(kind.customs.some((c) => c.startsWith("cover")), `${kind.id} head coverings`).toBe(true);
      expect(kind.customs.some((c) => ["vigil", "vespers", "vespersOrVigil"].includes(c)), `${kind.id} Saturday evening`).toBe(true);
      expect(kind.customs, kind.id).toContain("prostrations");
      if (kind.id === "unsure") expect(kind.language).toBeUndefined();
      else expect(kind.language?.en, kind.id).toMatch(/^Services /);
    }
  });

  it("head their customs with the hedge \"you may see\"", () => {
    for (const kind of KIND_LIST) expect(kind.see.en, kind.id).toMatch(/ you may see$/);
    expect(WORDS.customs.lead.en).toMatch(/differ from parish to parish/);
  });

  it("leave no custom unused", () => {
    const used = new Set<CustomId>(KIND_LIST.flatMap((k) => k.customs));
    expect(Object.keys(CUSTOMS).filter((c) => !used.has(c as CustomId))).toEqual([]);
  });

  it("answer Not sure gently: ask the parish's bishop, and name the Churches not in communion", () => {
    const note = NOT_SURE.map((l) => l.en).join(" ");
    expect(note).toMatch(/which bishop it is under/);
    expect(note).toMatch(/compare the answer with this list/);
    expect(note).toMatch(/Assyrian Church of the East/);
    expect(note).toMatch(/Oriental Orthodox/);
    // A verdict on a parish by name is never given: the note speaks of
    // Churches and of what to ask, never of "your parish is" or "is not Orthodox".
    expect(note).not.toMatch(/your parish is|is not Orthodox|not a real/i);
  });
});

describe("the guide's parts", () => {
  it("are four, in the order a visit goes, with the owner's additions", () => {
    expect(PART_IDS).toEqual(["before", "arrive", "during", "after"]);
    const ids = (p: keyof typeof PARTS) => PARTS[p].items.map((i) => i.id);
    expect(ids("before")).toEqual(expect.arrayContaining(["priest", "time", "wear", "arrive", "length"]));
    expect(ids("arrive")).toEqual(expect.arrayContaining(["narthex", "candles", "icons", "honour", "watch"]));
    expect(ids("during")).toEqual(
      expect.arrayContaining(["screen", "clergy", "incense", "little", "readings", "great", "creed", "communion", "bread", "standing", "cross"]),
    );
    expect(ids("after")).toEqual(expect.arrayContaining(["coffee", "priest"]));
    // "If they can, contact the priest beforehand and give him time to answer."
    expect(PARTS.before.items[0].id).toBe("priest");
    expect(PARTS.before.items[0].body.en).toMatch(/give him time to answer/);
  });

  it("keep the Liturgy's own order in During", () => {
    const order = PARTS.during.items.map((i) => i.id);
    const seq = ["little", "readings", "great", "creed", "communion", "bread"].map((id) => order.indexOf(id));
    expect(seq.every((at, i) => at >= 0 && (i === 0 || at > seq[i - 1]))).toBe(true);
  });

  it("say Communion is for Orthodox Christians, and that the blessed bread may be offered to a visitor", () => {
    const during = Object.fromEntries(PARTS.during.items.map((i) => [i.id, i.body.en]));
    expect(during.communion).toMatch(/Communion is for Orthodox Christians/);
    expect(during.communion).toMatch(/stay in your place/);
    expect(during.bread).toMatch(/antidoron/);
    expect(during.bread).toMatch(/a visitor may take a piece too/);
    expect(during.bread).toMatch(/not Communion/);
  });

  it("say honour, not worship, and rest it on the Seventh Ecumenical Council", () => {
    const honour = PARTS.arrive.items.find((i) => i.id === "honour");
    expect(honour?.body.en).toMatch(/honour, not worship/);
    expect(honour?.body.en).toMatch(/Seventh Ecumenical Council/);
    expect(honour?.why?.quotes.every((q) => q.source === "nicaea2")).toBe(true);
    expect(PARTS.arrive.items.find((i) => i.id === "watch")?.body.en).toMatch(/simply bow/);
  });

  it("say, in the reassuring voice, that it nearly always goes well", () => {
    for (const l of [WORDS.intro.calm, WORDS.ready.lead, WORDS.today.calm]) expect(l.en).toMatch(/nearly always goes well/);
  });
});

describe("what the guide rests on", () => {
  it("quotes every source verbatim, from the public-domain English the app carries", () => {
    const quotes = allQuotes();
    expect(quotes.length).toBeGreaterThanOrEqual(8);
    const flat = (s: string) => s.replace(/\s+/g, " ").trim();
    for (const { where, quote } of quotes) {
      const file = SOURCES[quote.source].file;
      expect(file, `${where}: ${quote.source} has no file to hold the quotation to`).toBeTruthy();
      const text = flat(read(file as string));
      // The file is JSON: compare against its strings, with JSON's escapes undone.
      const strings = flat(JSON.stringify(JSON.parse(read(file as string))))
        .replace(/\\"/g, '"')
        .replace(/\\n/g, " ");
      expect(text.length).toBeGreaterThan(0);
      expect(strings.includes(flat(quote.text)), `${where}: not verbatim in ${file}`).toBe(true);
    }
  });

  it("cites the councils and Fathers the owner's outline names", () => {
    const sources = new Set(allQuotes().map((q) => q.quote.source));
    for (const s of ["nicaea2", "nicaea1", "basil", "justin", "psalm140"]) expect(sources.has(s as never), s).toBe(true);
    expect(CUSTOMS.coverMany.cites).toContain("corinthians");
    expect(CUSTOMS.coverMany.line.en).toMatch(/1 Corinthians 11:5/);
    expect(CUSTOMS.prostrations.why?.quotes[0]).toMatchObject({ source: "nicaea1", at: "Canon 20" });
    // Split usage is noted, not hidden.
    expect(CUSTOMS.prostrations.line.en).toMatch(/in some parishes people kneel/);
  });

  it("is marked for a future clergy review, in the file and in the editorial queue", () => {
    expect(LITURGY_GUIDE_REVIEW).toEqual({ status: "awaiting-clergy-review", since: "2026-10-16" });
    const standards = read("docs", "editorial-standards.md");
    expect(standards).toMatch(/lib\/start\/firstLiturgy\.ts/);
    expect(standards).toMatch(/Your first Liturgy/);
  });

  it("opens only doors the app has", () => {
    const lost = doors().filter((href) => !hasScreen("app", href.replace(/#.*$/, "").split("/").filter(Boolean)));
    expect(lost).toEqual([]);
    // And the documents behind them.
    const councilDoc = (slug: string, doc: string) => COUNCILS.find((c) => c.slug === slug)?.documents.some((d) => d.slug === doc);
    expect(councilDoc("second-nicaea", "the-decree-on-the-holy-icons")).toBe(true);
    expect(councilDoc("first-nicaea", "the-twenty-canons")).toBe(true);
    const work = (saint: string, slug: string) => SAINTS.find((s) => s.slug === saint)?.works.some((w) => w.slug === slug);
    expect(work("basil-the-great", "on-the-holy-spirit")).toBe(true);
    expect(work("justin-martyr", "first-apology")).toBe(true);
    expect(planIdParams().some((p) => p.planId === "creed")).toBe(true);
  });
});

describe("the guide's words", () => {
  it("hold no em dash and no en dash, in the English or in any language", () => {
    for (const l of LINES) {
      expect(l.en.includes(EM_DASH), l.key).toBe(false);
      expect(l.en.includes(EN_DASH), l.key).toBe(false);
    }
    for (const { code } of LOCALES) {
      const words = catalog(code);
      for (const l of LINES) expect((words[l.key] ?? "").includes(EM_DASH), `${code} ${l.key}`).toBe(false);
    }
    expect(read("lib", "start", "firstLiturgy.ts").includes(EM_DASH)).toBe(false);
  });

  it("are each a key of their own, in English letter for letter as the file has them", () => {
    expect(new Set(LINES.map((l) => l.key)).size).toBe(LINES.length);
    for (const l of LINES) {
      expect(l.key.startsWith("start.liturgy."), l.key).toBe(true);
      expect(EN[l.key], l.key).toBe(l.en);
    }
  });

  it("are in all twenty-one languages, and translated, not copied", () => {
    expect(LOCALES.length).toBe(21);
    for (const { code } of LOCALES) {
      const words = catalog(code);
      const missing = [...LINES.map((l) => l.key), ...BORROWED].filter((k) => !words[k] || !words[k].trim());
      expect(missing, `${code} is missing`).toEqual([]);
      if (code === "en") continue;
      // A pass that did nothing leaves the English: a line of several words
      // that reads the same in another language was never translated.
      const copied = LINES.filter((l) => l.en.split(/\s+/).length > 3 && words[l.key] === l.en).map((l) => l.key);
      expect(copied, `${code} still has English`).toEqual([]);
    }
  });

  it("keep the onboarding's step to the guide in every language", () => {
    for (const { code } of LOCALES) {
      const words = catalog(code);
      expect(words["onboard.day1.firstLiturgy.title"], code).toBeTruthy();
      expect(words["onboard.day1.firstLiturgy.body"], code).toBeTruthy();
    }
  });

  it("give the checklist six lines, in order", () => {
    expect(CHECK_LIST.map((c) => c.id)).toEqual([...CHECK_IDS]);
    expect(CHECK_LIST.length).toBe(6);
  });
});

describe("the guide's screens", () => {
  const FILES = [
    "components/start/StartHere.tsx",
    "components/start/FirstLiturgyCard.tsx",
    "components/start/liturgy/FirstLiturgyGuide.tsx",
    "components/start/liturgy/GuideSteps.tsx",
    "components/start/liturgy/GuideSheets.tsx",
    "components/today/FirstLiturgyReminder.tsx",
    "app/(app)/start/page.tsx",
    "app/(app)/start/first-liturgy/page.tsx",
  ];
  /** A file's code without its notes. */
  const code = (file: string) =>
    read(file)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("keep the house rules", () => {
    for (const file of FILES) {
      const src = code(file);
      // No yellow or gold, no all-caps letter-spaced labels, no gradient
      // words, no side stripes, no glyphs set as icons.
      expect(src, file).not.toMatch(/gold|amber|yellow|premium/);
      expect(src, file).not.toMatch(/\buppercase\b|tracking-wide|tracking-widest|tracking-\[0\.[1-9]/);
      expect(src, file).not.toMatch(/bg-clip-text|text-transparent|bg-gradient/);
      expect(src, file).not.toMatch(/border-l-\d|border-s-\d|border-l-\[|border-s-\[/);
      expect(src, file).not.toMatch(GLYPHS);
      expect(src.includes(EM_DASH), file).toBe(false);
      // Motion only through the motion switch.
      expect(src, file).not.toMatch(/(^|[\s"'`])(transition-(all|colors|opacity|transform)|animate-)/m);
    }
  });

  it("open detail in the shared movable sheet", () => {
    const sheets = code("components/start/liturgy/GuideSheets.tsx");
    expect((sheets.match(/<Sheet\b/g) ?? []).length).toBe(3);
    expect(sheets).not.toMatch(/fixed inset-0/);
  });

  it("keep the guide's words out of Today and out of Start here's script", () => {
    // The reminder and the card read the plan alone: Today's script must not
    // carry the whole guide.
    for (const file of ["components/today/FirstLiturgyReminder.tsx", "components/start/FirstLiturgyCard.tsx", "components/start/StartHere.tsx"]) {
      expect(code(file), file).not.toMatch(/lib\/start\/firstLiturgy/);
    }
  });

  it("put the reminder on Today under the day's word, so the verse stays first", () => {
    // The apps' Today.
    const today = code("components/today/TodayMobileV3.tsx");
    const verse = today.indexOf("<VerseOfDayCard />");
    const reminder = today.indexOf("<FirstLiturgyReminder");
    expect(verse).toBeGreaterThan(-1);
    expect(reminder).toBeGreaterThan(verse);
    expect(reminder).toBeLessThan(today.indexOf("<PrayRail"));
    // The website's Today (app/page.tsx keeps TodayMobileV3 for the apps).
    const web = code("components/prayers/PrayersTodayClient.tsx");
    expect(web.indexOf("<FirstLiturgyReminder")).toBeGreaterThan(web.indexOf('aria-labelledby="today-verse"'));
    expect(web.indexOf("<FirstLiturgyReminder")).toBeLessThan(web.indexOf('aria-labelledby="today-pray"'));
  });

  it("give both pages their own bar, and no second one in the apps", () => {
    for (const file of ["app/(app)/start/page.tsx", "app/(app)/start/first-liturgy/page.tsx"]) {
      expect(code(file), file).toMatch(/<MobileTopBar\b[^>]*\bback\b/);
    }
    expect(code("app/(app)/start/page.tsx")).toMatch(/revealTitleOn="start-title"/);
    expect(code("components/start/StartHere.tsx")).toMatch(/id="start-title"/);
  });

  it("are found: in the sitemap, in search, and from the onboarding for an inquirer drawn to the Liturgy", () => {
    expect(read("app", "sitemap.ts")).toContain('"/start/first-liturgy"');
    expect(read("lib", "search", "buildCorpus.ts")).toContain('href: "/start/first-liturgy"');
    expect(read("lib", "onboarding", "space.ts")).toContain('{ key: "firstLiturgy", href: "/start/first-liturgy" }');
  });
});
