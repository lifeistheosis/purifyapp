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

  it("draws no box inside itself: the field lights as a whole, white on the dark palettes, ink on Parchment", () => {
    // The keyboard ring is still the app's everywhere else.
    expect(rule("*:focus-visible")).toMatch(/outline: 2px solid/);
    expect(css).toMatch(/\.search-field input:focus,\s*\.search-field input:focus-visible,\s*\.search-door:focus-visible \{\s*outline: none;/);
    const lit = rule(".search-field:focus-within,\n.search-door:focus-visible");
    expect(lit).toContain("0 0 24px rgb(255 255 255 / 0.16)");
    const ink = rule('html[data-reading-mode="parchment"] .search-field:focus-within,\nhtml[data-reading-mode="parchment"] .search-door:focus-visible');
    expect(ink).toContain("var(--color-paper) 66%");
    expect(ink).not.toContain("0 0 24px");
    // Its browser cross is hidden: it draws its own.
    expect(css).toMatch(/\.search-field input::-webkit-search-cancel-button/);
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
    // How to leave: the plate, Back, Escape, a computer's backdrop.
    expect(screen).toContain('aria-label={t("common.close")}');
    expect(screen).toContain("useAndroidBack(open, close);");
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
