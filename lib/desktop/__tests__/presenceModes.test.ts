import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import {
  DEFAULT_PREFS,
  artQuery,
  buildPresence,
  effectiveMode,
  nextNameDay,
  parsePrefs,
  progressPercent,
  quoteOfTheDay,
  scriptureAuthor,
  unitFor,
  type BuildInput,
  type PresencePrefs,
} from "@/lib/desktop/presenceModes";
import { getSaint } from "@/lib/saints/saints";

const messages = en as Record<string, string>;
const t = (key: string, vars?: Record<string, string | number>) =>
  (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`));

function input(prefs: Partial<PresencePrefs>, rest: Partial<BuildInput> = {}): BuildInput {
  return { prefs: { ...DEFAULT_PREFS, ...prefs }, plusAllowed: true, t, pathname: "/", ...rest };
}

const NICHOLAS = { slug: "nicholas-the-wonderworker", name: "St. Nicholas the Wonderworker", pronoun: "his" as const };
const BASIL = { slug: "basil-the-great", name: "St. Basil the Great", pronoun: "his" as const };

describe("the Discord modes", () => {
  it("say nothing while off", () => {
    expect(buildPresence(input({ mode: "off" }))).toBeNull();
  });

  it("show the patron with their name day, and today when it is today", () => {
    const r = buildPresence(
      input({ mode: "patron" }, { patron: { saint: NICHOLAS, nameDay: { today: false, date: "December 6" } } }),
    )!;
    expect(r.details).toBe("St. Nicholas the Wonderworker");
    expect(r.state).toBe("Name day · December 6");
    expect(r.art).toEqual({ saint: "nicholas-the-wonderworker" });
    expect(r.path).toBe("/saints/nicholas-the-wonderworker");
    expect(r.buttonLabel).toBe("Read his life");
    expect(r.homeLabel).toBe("Visit Purify");
    const today = buildPresence(
      input({ mode: "patron" }, { patron: { saint: NICHOLAS, nameDay: { today: true, date: "December 6" } } }),
    )!;
    expect(today.state).toBe("Name day today");
  });

  it("fall back to In Purify when the mode has nothing to show yet", () => {
    expect(buildPresence(input({ mode: "patron" }))!.details).toBe("In Purify");
    expect(buildPresence(input({ mode: "favorite" }))!.details).toBe("In Purify");
  });

  it("quote the favorite saint word for word, and only their own page for the button", () => {
    const quote = { text: "Glory to God for all things.", source: "His last words, at Comana in Pontus, 407" };
    const r = buildPresence(
      input(
        { mode: "favorite" },
        { favorite: { saint: { slug: "john-chrysostom", name: "St. John Chrysostom", pronoun: "his" }, quote } },
      ),
    )!;
    expect(r.state).toBe("“Glory to God for all things.”");
    expect(r.largeText).toBe(quote.source);
    expect(r.path).toBe("/saints/john-chrysostom");
    // A line whose link goes to another saint's work keeps the button on
    // this saint's own page.
    const other = buildPresence(
      input(
        { mode: "favorite" },
        {
          favorite: {
            saint: { slug: "john-chrysostom", name: "St. John Chrysostom", pronoun: "his" },
            quote: { ...quote, href: "/saints/gregory-palamas/essence-and-energies" },
          },
        },
      ),
    )!;
    expect(other.path).toBe("/saints/john-chrysostom");
  });

  it("track a chapter of Scripture with the writer's portrait and a live bar", () => {
    const r = buildPresence(
      input(
        { mode: "reading" },
        { place: { kind: "scripture", book: "john", chapter: 3, chapters: 21, fraction: 0.5, authorName: "Holy Apostle and Evangelist John" } },
      ),
    )!;
    expect(r.details).toBe("Reading John");
    expect(r.state).toBe("Chapter 3 of 21 · 12%");
    expect(r.art).toEqual({ saint: "apostle-john", progress: 12 });
    expect(r.largeText).toBe("Holy Apostle and Evangelist John");
    expect(r.path).toBe("/bible/john/3");
    expect(r.buttonLabel).toBe("Read along");
  });

  it("track a saint's work by its own sections", () => {
    const r = buildPresence(
      input(
        { mode: "reading" },
        {
          place: {
            kind: "work",
            saint: BASIL,
            path: "/saints/basil-the-great/on-the-holy-spirit",
            title: "On the Holy Spirit",
            unit: "chapter",
            section: 9,
            sections: 30,
            fraction: 0.4,
          },
        },
      ),
    )!;
    expect(r.details).toBe("Reading On the Holy Spirit");
    expect(r.state).toBe("Chapter 9 of 30 · 28%");
    expect(r.art).toEqual({ saint: "basil-the-great", progress: 28 });
    expect(r.largeText).toBe("St. Basil the Great");
    expect(r.path).toBe("/saints/basil-the-great/on-the-holy-spirit");
  });

  it("drop the place, and the bar with it, when the reader hides the place", () => {
    const r = buildPresence(
      input({ mode: "reading", showPlace: false }, { place: { kind: "scripture", book: "romans", chapter: 8, chapters: 16, fraction: 0 } }),
    )!;
    expect(r.details).toBe("Reading Scripture");
    expect(r.state).toBe("Romans");
    expect(r.art).toEqual({ saint: "apostle-paul", progress: undefined });
    expect(r.path).toBe("/bible/romans");
  });

  it("keep the bar off when asked, and the place on", () => {
    const r = buildPresence(
      input({ mode: "reading", liveBar: false }, { place: { kind: "scripture", book: "genesis", chapter: 1, chapters: 50, fraction: 0 } }),
    )!;
    expect(r.state).toBe("Chapter 1 of 50");
    expect(r.art).toBeUndefined();
  });

  it("keep the first version's words off a text, prayer only as At prayer", () => {
    const r = buildPresence(input({ mode: "reading" }, { pathname: "/prayers/morning" }))!;
    expect(r.details).toBe("At prayer");
    expect(r.state).toBeUndefined();
    expect(r.art).toBeUndefined();
    const saint = buildPresence(
      input({ mode: "reading" }, { pathname: "/saints/basil-the-great", title: "St. Basil the Great | Purify" }),
    )!;
    expect(saint.art).toEqual({ saint: "basil-the-great" });
    const account = buildPresence(input({ mode: "reading" }, { pathname: "/account/profile" }))!;
    expect(account.details).toBe("In Purify");
  });

  it("frame the portrait in the season's color under Plus custom", () => {
    const r = buildPresence(
      input(
        { mode: "plus", plusBase: "patron", followSeason: true, gilded: true },
        {
          patron: { saint: NICHOLAS, nameDay: { today: false, date: "December 6" } },
          today: { color: "purple", reason: "Great Lent" },
        },
      ),
    )!;
    expect(r.art).toEqual({ saint: "nicholas-the-wonderworker", season: "purple", gilded: true });
    expect(r.badge).toBe("purple");
    expect(r.smallText).toBe("Great Lent");
    const chosen = buildPresence(
      input(
        { mode: "plus", plusBase: "patron", followSeason: false, season: "blue", gilded: false },
        { patron: { saint: NICHOLAS, nameDay: null }, today: { color: "purple", reason: "Great Lent" } },
      ),
    )!;
    expect(chosen.art).toEqual({ saint: "nicholas-the-wonderworker", season: "blue", gilded: false });
    expect(chosen.smallText).toBeUndefined();
  });

  it("show Plus custom plainly to a reader without Plus", () => {
    expect(effectiveMode({ ...DEFAULT_PREFS, mode: "plus", plusBase: "favorite" }, false)).toEqual({ base: "favorite", plus: false });
    const r = buildPresence({
      ...input({ mode: "plus", plusBase: "patron" }, { patron: { saint: NICHOLAS, nameDay: null } }),
      plusAllowed: false,
    })!;
    expect(r.badge).toBeUndefined();
    expect(r.art).toEqual({ saint: "nicholas-the-wonderworker" });
  });
});

describe("the parts", () => {
  it("count progress through the whole book or work", () => {
    expect(progressPercent(1, 21, 0)).toBe(0);
    expect(progressPercent(3, 21, 0.5)).toBe(12);
    expect(progressPercent(21, 21, 1)).toBe(100);
    expect(progressPercent(1, 1, 0.42)).toBe(42);
    expect(progressPercent(40, 21, 0)).toBe(95);
    expect(progressPercent(3, 0, 0.5)).toBe(0);
    expect(progressPercent(3, 21, Number.NaN)).toBe(10);
  });

  it("build the picture's query exactly as presence.rs does", () => {
    // presence.rs, the_picture_url_is_built_here_from_checked_parts.
    expect(artQuery({ saint: "apostle-john", progress: 12 })).toBe("saint=apostle-john&p=12");
    expect(artQuery({ saint: "basil-the-great", progress: 62, season: "purple", gilded: true })).toBe(
      "saint=basil-the-great&p=62&season=purple&gilded=1",
    );
    expect(artQuery({ progress: 0 })).toBe("p=0");
    expect(artQuery({ saint: "apostle-paul", gilded: true })).toBe("saint=apostle-paul");
    expect(artQuery({ saint: "../x", progress: 101 })).toBe("");
  });

  it("name only writers the library has an icon for", () => {
    for (const book of ["john", "revelation", "romans", "hebrews", "1-peter", "jude", "micah", "matthew"]) {
      const slug = scriptureAuthor(book)!;
      expect(slug, book).toBeTruthy();
      expect(getSaint(slug)?.iconUrl, `${book} -> ${slug}`).toBeTruthy();
    }
    expect(scriptureAuthor("genesis")).toBeUndefined();
    expect(scriptureAuthor("constructor")).toBeUndefined();
  });

  it("read a work's unit off its first section", () => {
    expect(unitFor("Chapter I. Prefatory remarks")).toBe("chapter");
    expect(unitFor("Book I")).toBe("book");
    expect(unitFor("Homily 1, Preface")).toBe("homily");
    expect(unitFor("Discourse I")).toBe("discourse");
    expect(unitFor("Part I")).toBe("part");
    expect(unitFor("Salutation")).toBe("section");
    expect(unitFor(undefined)).toBe("section");
  });

  it("pick a line of the day that fits on the card, the same all day", () => {
    const quotes = getSaint("john-chrysostom")!.quotes!;
    const a = quoteOfTheDay(quotes, 20_000)!;
    expect(a.text.length).toBeLessThanOrEqual(100);
    expect(quoteOfTheDay(quotes, 20_000)).toEqual(a);
    const seen = new Set(Array.from({ length: 10 }, (_, i) => quoteOfTheDay(quotes, 20_000 + i)!.text));
    expect(seen.size).toBeGreaterThan(1);
    expect(quoteOfTheDay([{ text: "x".repeat(101), source: "" }], 1)).toBeNull();
    expect(quoteOfTheDay(undefined, 1)).toBeNull();
  });

  it("find the next name day on the reader's own calendar", () => {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const day = (s: string) => new Date(`${s}T12:00:00Z`);
    expect(nextNameDay(["December 6", "May 9"], day("2026-09-26"), "new", fmt)).toEqual({ today: false, date: "2026-12-06" });
    expect(nextNameDay(["December 6"], day("2026-12-06"), "new", fmt)).toEqual({ today: true, date: "2026-12-06" });
    expect(nextNameDay(["December 6"], day("2026-12-07"), "new", fmt)).toEqual({ today: false, date: "2027-12-06" });
    // Old Calendar: thirteen days later by the civil date.
    expect(nextNameDay(["December 6"], day("2026-12-10"), "old", fmt)).toEqual({ today: false, date: "2026-12-19" });
    expect(nextNameDay(["December 25"], day("2027-01-07"), "old", fmt)).toEqual({ today: true, date: "2027-01-07" });
    expect(nextNameDay(["not a date"], day("2026-09-26"), "new", fmt)).toBeNull();
    expect(nextNameDay([], day("2026-09-26"), "new", fmt)).toBeNull();
  });

  it("read stored choices defensively", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({ mode: "reading", favorite: "basil-the-great" })).toMatchObject({ mode: "reading", favorite: "basil-the-great" });
    expect(parsePrefs({ mode: "app", season: "mauve", favorite: "../x", gilded: "yes" })).toEqual(DEFAULT_PREFS);
  });
});
