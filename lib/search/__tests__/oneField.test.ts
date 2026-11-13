// One field and one search in every place (1.8, the owner's note 46 of build
// 80 and his pick of r3-12, "C, with the mix of B").
//
// His photo of Theology's "Search the library": a sharp box drawn inside the
// round field, and the line cut mid-word. The box was the keyboard ring
// (globals.css, *:focus-visible): a text field matches it on a tap, and each
// field's own focus:outline-none is a utility, which loses to an unlayered
// rule. Fourteen fields each drew themselves; now there is one.
//
// What a reader would notice if this broke: the box inside a field again, a
// phone zooming into a field set under 16px, a field with no way to clear
// it, a place's own search giving other answers than the app's, or the
// search not opening on the place it was opened from. Read as text: these
// are client components, and the built screens are measured in the walk.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};

const FIELD = "components/search/SearchField.tsx";
const SCREEN = "components/search/CommandPalette.tsx";

/** The places that search the whole library: each opens the one search, turned to itself. */
const DOORS: Record<string, string> = {
  "components/bible/BibleSearch.tsx": 'place="bible"',
  "components/saints/SaintSearch.tsx": 'place="saints"',
  "components/history/HistorySearch.tsx": 'place="history"',
  "components/prayers/PrayerSearch.tsx": 'place="prayers"',
  "components/dictionary/Dictionary.tsx": 'place="dictionary"',
  "components/theology/TheologySearch.tsx": 'openSearch("theology")',
  "components/mobile/DiscoverMobile.tsx": '<SearchDoor placeholderKey="search.ariaLabel"',
};
/** The places that filter their own list: they keep filtering in place, in the same field. */
const IN_PLACE = [
  "components/reading/ReadingRoom.tsx",
  "components/shop/ShopBrowseControls.tsx",
  "components/journal/JournalFeed.tsx",
  "components/saved/SavedList.tsx",
  "components/prayers/Diptychs.tsx",
  "components/prayers/mine/LibrarySheet.tsx",
];

describe("the one field", () => {
  const field = code(FIELD);

  it("is a search form with the keyboard's Search key, 16px type and a clear button", () => {
    expect(field).toContain('role="search"');
    expect(field).toContain('type="search"');
    expect(field).toContain('enterKeyHint="search"');
    // An iPhone zooms the page into a field set under 16px.
    expect(field).toContain("text-[16px]");
    expect(field).not.toMatch(/\btext-ui\b/);
    expect(field).toMatch(/aria-label=\{t\("study\.clear"\)\}/);
    // Sized in px: the page's base is 17px, so h-12 would be 51.
    expect(field).toContain("h-[48px]");
  });

  it("draws no box inside itself: the field as a whole shows it is active, the house's quiet way", () => {
    // The keyboard ring is still the app's everywhere else.
    expect(rule("*:focus-visible")).toMatch(/outline: 2px solid/);
    expect(css).toMatch(/\.search-field input:focus,\s*\.search-field input:focus-visible,\s*\.search-door:focus-visible \{\s*outline: none;/);
    // Active (1.9): a fine edge in the palette's ink, the share every tapped field wears. It lit
    // with a 58 percent white edge, a 3px ring and a 24px glow until his word of 2026-11-10
    // ("it appears a white box ... like outline. I don't like that"), which names search.
    const active = rule(".search-field:focus-within,\n.search-door:focus-visible");
    expect(active).toContain("border-color: color-mix(in srgb, var(--color-paper) 32%, transparent);");
    expect(active).not.toContain("box-shadow");
    expect(active).not.toMatch(/outline|58%/);
    // Nothing round the pill on any palette: no glow, no ring, and no rule of Light's own that draws one.
    const block = css.slice(css.indexOf("/* ── Search: the one field and the one screen"), css.indexOf(".search-field .search-glass {"));
    expect(block).not.toMatch(/0 0 24px|0 0 0 3px/);
    expect(css).not.toContain('html[data-reading-mode="parchment"] .search-field:focus-within');
    // The token turns with the palette, so Light's edge is its own ink.
    expect(active).not.toMatch(/#[0-9a-f]{3,6}/i);
    // Its browser cross is hidden: it draws its own.
    expect(css).toMatch(/\.search-field input::-webkit-search-cancel-button/);
  });

  it("keeps the keyboard's ring for a keyboard, round the pill as a whole", () => {
    const ring = rule('html[data-input="keyboard"] .search-field:focus-within,\nhtml[data-input="keyboard"] .search-door:focus-visible');
    expect(ring).toContain("outline: 2px solid color-mix(in srgb, var(--color-paper) 70%, transparent);");
    expect(ring).toContain("outline-offset: 2px;");
    // After the rule that puts the door's own ring away, so a keyboard's wins it.
    expect(css.indexOf('html[data-input="keyboard"] .search-door:focus-visible')).toBeGreaterThan(-1);
    // And a finger never gets it: the page starts in pointer mode, and typing does not leave it (fieldFocus.test.ts).
    expect(css).not.toMatch(/html\[data-input="pointer"\] \.search-field:focus-within[^{]*\{[^}]*outline: 2px/);
  });

  it("moves only with Purify's motion on", () => {
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.search-field,\s*:where\(\[data-motion="reduce"\]\) \.search-field \.search-glass \{\s*transition: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.search-in \{\s*animation: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.search-row \{\s*transition: none;/);
  });

  it("is the only search input in the fourteen places", () => {
    const places = [...Object.keys(DOORS), ...IN_PLACE, SCREEN];
    expect(places).toHaveLength(14);
    for (const file of places) {
      const src = code(file);
      expect(src, file).not.toMatch(/<input[^>]*type="search"/);
      expect(src, file).not.toMatch(/<input[^>]*enterKeyHint/);
      expect(/<SearchField\b|<SearchDoor\b|openSearch\("/.test(src), file).toBe(true);
    }
  });
});

describe("each field's line", () => {
  // Measured 2026-10-30 in Chromium, DM Sans at 16px with the app's Noto
  // fallbacks, against the room each field leaves at a 360px phone (its
  // page's padding, the field's magnifier and ends, and what stands beside
  // it), in all 21 languages. The longest of each, and its room:
  //   "Search Purify"        hu 229 of 241px (the screen's dock), 256 (Discover)
  //   "Search the Bible"     fr 182 of 256    "Search the saints"  fr 205 of 256
  //   "Find a word"          pt 167 of 256    "Search your journal" el 235 of 264
  //   "Search the prayer book", in the rule's sheet: fr 255 of 273
  //   "Search" beside Filter, Filters or Cancel: el 82 of 136, fil 77 of 130
  // The lines they replaced were cut: "Search a verse (John 3:16, Ps 23)" in
  // eight languages, "Search Church history" beside Filter in every one,
  // English too, the shop's and the reading room's in nearly all. A longer
  // line put back here has to be measured again first.
  const LINES: Record<string, string[]> = {
    "components/search/CommandPalette.tsx": ['placeholder={t("search.ariaLabel")}'],
    "components/mobile/DiscoverMobile.tsx": ['placeholderKey="search.ariaLabel"'],
    "components/bible/BibleSearch.tsx": ['placeholderKey="bible.searchAria"'],
    "components/saints/SaintSearch.tsx": ['placeholderKey="settings.discordFavoriteSearch"'],
    "components/history/HistorySearch.tsx": ['short ? "search.open" : "study.history.searchChurchHistory"'],
    "components/prayers/PrayerSearch.tsx": ['placeholderKey="search.open"'],
    "components/dictionary/Dictionary.tsx": ['placeholderKey="dictionary.filter"'],
    "components/reading/ReadingRoom.tsx": ['placeholder={t("search.open")}'],
    "components/shop/ShopBrowseControls.tsx": ['placeholder={searchPlaceholder ?? t("search.open")}'],
    "components/journal/JournalFeed.tsx": ['placeholder={t("journal.search")}'],
    "components/saved/SavedList.tsx": ['placeholder={t("search.open")}'],
    "components/prayers/Diptychs.tsx": ['placeholder={t("common.search")}'],
    "components/prayers/mine/LibrarySheet.tsx": ['placeholder={t("prayers.searchPlaceholder")}'],
  };

  it("is the one measured to fit a 360px phone in every language", () => {
    for (const [file, lines] of Object.entries(LINES)) {
      for (const line of lines) expect(code(file), file).toContain(line);
    }
    // History's long line only where a tablet's row has room for it.
    const page = code("components/history/HistoryTimelinePage.tsx");
    expect(page.match(/<HistorySearchInline short\b/g)).toHaveLength(2);
    expect(page.match(/<HistorySearchInline\b/g)).toHaveLength(3);
    // No English typed into a field's line.
    expect(code("components/shop/StoreClient.tsx")).not.toContain("searchPlaceholder={`Search");
  });
});

describe("one search, opened from each place on that place", () => {
  it("opens from the places that search the whole library, turned to each", () => {
    for (const [file, opens] of Object.entries(DOORS)) expect(code(file), file).toContain(opens);
  });

  it("keeps the places that filter their own list filtering in place, in the same field", () => {
    for (const file of IN_PLACE) {
      const src = code(file);
      expect(src, file).toContain("<SearchField");
      expect(src, file).not.toContain("<SearchDoor");
    }
  });

  it("is one screen, opened by one event, reading both lists with relative addresses so it works with no signal", () => {
    const screen = code(SCREEN);
    expect(screen).toContain("window.addEventListener(SEARCH_OPEN_EVENT, onOpen)");
    expect(screen).toContain('loader<SearchItem>("/search-corpus.json")');
    expect(screen).toContain('loader<TheologyEntry>("/theology-search.json")');
    expect(screen).not.toMatch(/apiFetch|https?:\/\//);
    // The field at the foot, over the keyboard, clear of the screen's edge.
    expect(screen).toContain("const frame = useVisibleFrame();");
    expect(screen).toContain("style={phone && frame ? { top: frame.top, height: frame.height } : undefined}");
    expect(screen).toMatch(/data-search-dock=""[^>]*search-dock shrink-0", !keyboardUp && "safe-pb-edge/);
    // How to leave: the plate, Back, Escape, a computer's backdrop. Back is
    // the page's again once it begins to leave (build 95 note 5).
    expect(screen).toContain('aria-label={t("common.close")}');
    expect(screen).toContain("useAndroidBack(covering, close);");
    expect(screen).toMatch(/e\.key === "Escape"/);
    // The page holds still under it and the floating pills step aside.
    expect(screen).toContain("setOverlayOpen(true);");
    expect(screen).toContain("lockBodyScroll();");
    // "Search Purify": the line the sheet measured at 360px in every language.
    expect(screen).toContain('placeholder={t("search.ariaLabel")}');
    // With no signal one quiet line says so, and the shop goes grey.
    expect(screen).toContain("<OfflineLine />");
    expect(screen).toContain('new Set<DoorId>(["shop"])');
  });

  it("keeps the words searched on the phone, and the old list of results is gone", () => {
    const screen = code(SCREEN);
    expect(screen).toContain("rememberWords(");
    expect(screen).not.toMatch(/rememberRecent|SearchToday/);
    expect(fs.existsSync(path.join(ROOT, "components/search/SearchToday.tsx"))).toBe(false);
  });
});

describe("the screen holds still as it opens (build 87, the owner's note 83)", () => {
  // Build 86 on his phone: "when you click search it leads you to this screen
  // but buggy". Recorded frame by frame on its export, the screen drew
  // "Search", Look in and the doors at its foot, held on the field by a
  // spacer over the title, and when the keyboard came up a moment after the
  // tap they all jumped up by its height, leaving the top third empty. The
  // walk's section 44 records the built screen; this holds the source.
  const screen = code(SCREEN);
  const empty = screen.slice(screen.indexOf("if (!typing) {"), screen.indexOf("} else if (compose) {"));

  it("stands from the top before anything is typed: the title first, no spacer over it", () => {
    expect(empty.length).toBeGreaterThan(0);
    const drawn = empty.slice(empty.indexOf("body = ("));
    const first = drawn.split("\n").slice(1).map((line) => line.trim()).find((line) => line && line !== "<>") ?? "";
    expect(first).toMatch(/^<h2 /);
    expect(empty).not.toMatch(/flex-1/);
    // The recent words under the doors, marked for the walk.
    expect(empty).toContain('data-search-recent=""');
    expect(empty.indexOf("<Doors ")).toBeLessThan(empty.indexOf("data-search-recent"));
  });

  it("keeps the rows that scroll sideways at their own height in its column, however long the body runs", () => {
    // The body is a column that scrolls; a row that scrolls sideways has no
    // height of its own to keep in one. Build 87's walk: with the day under
    // the doors the body ran taller than the room the keyboard leaves, and
    // the doors were squeezed from 107px to 9 as it came up.
    const rows = code("components/search/SearchRows.tsx");
    const doors = /data-search-doors="" className=\{cn\("([^"]*)"/.exec(rows)?.[1] ?? "";
    expect(doors).toContain("overflow-x-auto");
    expect(doors.split(" ")).toContain("shrink-0");
    const kinds = /data-search-kinds=""[\s\S]*?className="([^"]*)"/.exec(rows)?.[1] ?? "";
    expect(kinds).toContain("overflow-x-auto");
    expect(kinds.split(" ")).toContain("shrink-0");
    expect(screen).toContain('className="search-in flex min-h-0 flex-1 flex-col overflow-y-auto');
  });

  it("draws a kind's count at its name's share or more", () => {
    // The counts stood at 34 of the ink: 3.10:1 on Dark and 2.01:1 on Light where the strip
    // stands, under the 4.5:1 words need (checkMock on the Search sheet from Saints, the gate's
    // confirm run, 2026-11-12). The name's own share reads on every palette and look.
    const rows = code("components/search/SearchRows.tsx");
    const strip = rows.slice(rows.indexOf("export function KindStrip"));
    const name = Number(/className="search-tab [^"]*text-paper\/(\d+)"/.exec(strip)?.[1]);
    const count = /on \? "text-paper\/(\d+)" : "text-paper\/(\d+)"\)\}>\{n\}/.exec(strip);
    expect(name).toBe(50);
    expect(Number(count?.[1])).toBeGreaterThanOrEqual(name);
    expect(Number(count?.[2])).toBeGreaterThanOrEqual(name);
  });

  it("keeps the strip's place while the lists arrive, at the strip's own height", () => {
    expect(screen).toContain("const stripComing = corpus === null && (DOOR_KINDS[turn.door]?.length ?? 0) > 0;");
    expect(empty).toContain('stripComing ? <div aria-hidden className="mt-3 h-[44px]" /> : null');
    expect(code("components/search/SearchRows.tsx")).toContain('className="no-scrollbar flex h-[44px] shrink-0');
  });

  it("arrives by fading in where it stands, with no rise", () => {
    const keyframes = /@keyframes search-in \{([^}]*\})\s*\}/.exec(css)?.[1] ?? "";
    expect(keyframes).toMatch(/from \{ opacity: 0; \}/);
    expect(keyframes).not.toContain("transform");
    expect(screen).toContain('className="search-in flex min-h-0 flex-1 flex-col overflow-y-auto');
  });
});
