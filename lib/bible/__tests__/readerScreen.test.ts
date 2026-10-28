// The Scripture chapter screen on a phone and a tablet (1.8, "The page").
//
// The owner's pick B of round 2, locked 2026-10-27 (Homebase/boards/
// purify-master/variants/02-bible.png, INDEX.md): "No bar at all, only two
// round buttons over the page. The chapter opens like a book. The floating
// pill comes back when you scroll up, with Listen." And from 1.7 (his notes 1
// to 8 of 2026-10-16, r17/BRAINSTORM.md), what the page keeps: the
// translation, the book and the settings each in a movable sheet, the slim
// chapter strip with the current chapter lit, on a tablet one centred column
// with the Fathers in the sheet, and focus mode's way out at the foot.
//
// What a reader would notice if this broke: a bar back over the chapter, the
// first verse at the foot of the first screen again under a row of pills, a
// control of the old bar or row with nowhere to be found, the pill and the
// round buttons that never leave or never come back, the words under the
// clock, the iPad's text pushed left, or "Exit focus" back in the top right.
// This reads the source; the built screens are measured by sections 33, 35
// and 43 of scripts/export-walk.mjs.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old screen is not read as the screen. */
const code = (path: string) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
/** The stylesheet's rules without its notes. */
const rules = () => read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

const SCREEN = "components/bible/ChapterScreen.tsx";
const PAGE = "app/(app)/bible/[book]/[chapter]/page.tsx";
const BAR = "components/nav/MobileTopBar.tsx";
const ACTIONS = "components/bible/MobileReaderActions.tsx";
const MORE = "components/bible/ReaderMoreSheet.tsx";
const PILL = "components/bible/MobileChapterPill.tsx";

describe("no bar: round buttons over the page", () => {
  it("mounts the page's top as plates, the way back to the Bible on one side and Aa and ••• on the other", () => {
    const page = code(PAGE);
    const bar = /<MobileTopBar\b[\s\S]*?\/>\s*\}/.exec(page)?.[0] ?? "";
    expect(bar).toMatch(/<MobileTopBar\s+plates\b/);
    expect(bar).toContain('back="/bible"');
    expect(bar).toMatch(/trailing=\{\s*<MobileReaderActions\b[\s\S]*configuredLicensed=\{configuredLicensed\}/);
    // The page names itself: no title in the bar, no verse line under it.
    expect(bar).not.toMatch(/\btitleKey=|\bsubtitle=/);
    expect(page).not.toContain("ChapterVerseStatus");
  });

  it("draws no bar in plates mode: no ground, no title and no search of its own", () => {
    const bar = code(BAR);
    const plates = bar.slice(bar.indexOf("if (plates) {"), bar.indexOf("return (", bar.indexOf("if (plates) {") + 40));
    expect(plates).toContain("data-mobile-topbar");
    expect(plates).toContain("data-plates");
    expect(plates).toContain("data-plates-row");
    expect(plates).toContain('style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}');
    expect(plates).toMatch(/pointer-events-none fixed inset-x-0 top-0 z-30/);
    for (const gone of ["<h1", "<SearchTrigger", "bg-night", "backdrop-blur", "border-b"]) {
      expect(plates, gone).not.toContain(gone);
    }
    // The site's menu stays on the web, where a phone has no tab bar.
    expect(plates).toMatch(/<WebOnly>\s*<SiteMenuButton \/>\s*<\/WebOnly>/);
  });

  it("holds two round buttons, Aa for the settings and ••• for the rest, each opening a sheet", () => {
    const actions = code(ACTIONS);
    const buttons = [...actions.matchAll(/<button\b[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-label={t("bible.readerSettings")}');
    expect(buttons[0]).toMatch(/<span>A<\/span>\s*<span>a<\/span>/);
    expect(buttons[1]).toContain('aria-label={t("bible.moreActions")}');
    expect(buttons[1]).toContain("<More size={20} />");
    for (const b of buttons) {
      expect(b).toContain('aria-haspopup="dialog"');
      expect(b).toMatch(/\bhit-44\b/);
    }
    expect(actions).toMatch(/<ReaderSettingsSheet open=\{open === "settings"\}/);
    expect(actions).toMatch(/<ReaderMoreSheet\s+open=\{open === "more"\}/);
  });

  it("gives the plates the design's look in every palette: opaque, inside a hairline, never blurred", () => {
    const css = rules();
    const plate = /\[data-mobile-topbar\]\[data-plates\] :is\(a, button\) \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(plate).toContain("pointer-events: auto;");
    expect(plate).toContain("border-radius: 9999px;");
    expect(plate).toContain("background-color: color-mix(in srgb, var(--color-paper) 6%, var(--color-night));");
    expect(plate).toContain("border-color: color-mix(in srgb, var(--color-paper) 10%, transparent);");
    const section = css.slice(css.indexOf("[data-mobile-topbar][data-plates] {"), css.indexOf("@keyframes page-open-rise"));
    expect(section).not.toMatch(/backdrop-filter|blur\(/);
  });
});

describe("the safe areas", () => {
  it("keeps the strip under the clock covered, and the page starting under the plates", () => {
    const css = rules();
    expect(css).toMatch(/\[data-mobile-topbar\]\[data-plates\] \{\s*background: linear-gradient\(var\(--color-night\), var\(--color-night\)\) top \/ 100% env\(safe-area-inset-top, 0px\) no-repeat;/);
    // On the web the page pads for a notch as the bar did; in the apps <main> does (.safe-pt).
    expect(css).toMatch(/html:not\(\.is-native\) \.under-plates \{\s*padding-top: calc\(72px \+ env\(safe-area-inset-top, 0px\)\);/);
    expect(css).toMatch(/html\.is-native \.under-plates \{\s*padding-top: 72px;/);
    expect(code(SCREEN)).toMatch(/<section className="[^"]*\bunder-plates md:pt-16\b[^"]*\bsafe-pb-reader\b/);
    expect(code("app/(app)/bible/[book]/[chapter]/loading.tsx")).toContain("under-plates md:pt-16");
    // The tablet's 16px under a sticky bar went with the bar.
    expect(css).not.toContain("native-md-pt-4");
  });

  it("runs the reading line along the top, under the status bar, and on the computer under its header", () => {
    const css = rules();
    expect(css).toMatch(/\.reader-progress \{\s*top: env\(safe-area-inset-top, 0px\);/);
    expect(css).toMatch(/html:not\(\.is-native\) \.reader-progress \{\s*top: 72px;/);
    const bar = code("components/bible/ReadingProgressBar.tsx");
    expect(bar).toContain('className="reader-progress fixed left-0 right-0 z-50"');
    expect(bar).not.toContain("below-topbar");
    // Focus lifts it to the top on the computer too, after the rule that sets it under the header.
    expect(css.indexOf("html.reader-focus .reader-progress")).toBeGreaterThan(css.indexOf("html:not(.is-native) .reader-progress"));
  });

  it("keeps the pill clear of the tab bar, the player and the home indicator", () => {
    expect(code(PILL)).toContain(
      '"calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)"',
    );
  });
});

describe("the chapter opens like a book", () => {
  const screen = code(SCREEN);
  const column = screen.indexOf('<div className="min-w-0 mx-auto w-full max-w-[680px]">');
  const title = screen.indexOf('<header id="chapter-title"');
  const header = screen.slice(title, screen.indexOf("</header>", title));

  it("opens on its words: nothing stands above the title in the text's column", () => {
    expect(column).toBeGreaterThan(-1);
    expect(title).toBeGreaterThan(column);
    expect(screen.slice(column, title).replace(/<div className="min-w-0 mx-auto w-full max-w-\[680px\]">/, "").trim()).toBe("");
    // The 1.7 row, the field and the strip are not on the page.
    for (const gone of ["<MobileTranslationPill", "<MobileBookPill", "<MobileChapterStrip", "<BibleSearch layer", '<div className="md:hidden native-md-block" data-reader-chrome>']) {
      expect(screen, gone).not.toContain(gone);
    }
  });

  it("names the book, large, over its chapter, in one heading, with a short rule under it", () => {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(header)?.[1] ?? "";
    expect(h1).toMatch(/<span className="page-open-title [^"]*text-\[40px\][^"]*min-\[380px\]:text-\[44px\]">\s*<T k=\{`bible\.books\.\$\{slug\}`\} \/>\s*<\/span>\{" "\}/);
    expect(h1).toMatch(/<span className="page-open-sub [^"]*text-paper\/55">\s*<T k="bible\.chapterN" replacements=\{\{ n: chapter \}\} \/>/);
    expect(header).toContain('className="mb-5 text-center"');
    expect(header).toMatch(/<span aria-hidden className="page-open-rule mx-auto mt-5 block h-px w-7 bg-paper\/25" \/>/);
    // No Listen on the title's line, and no rule across the column under it.
    expect(header).not.toContain("ListenButton");
    expect(screen).not.toMatch(/<hr\b/);
  });

  it("brings the name, the chapter, the rule and the first lines in one after another, after the route's fade", () => {
    const css = rules();
    expect(css).toMatch(/@keyframes page-open-rise \{\s*from \{ opacity: 0; transform: translateY\(var\(--rise-title, 6px\)\); \}/);
    expect(css).toMatch(/@keyframes page-open-fade \{\s*from \{ opacity: 0; \}/);
    expect(css).toMatch(/@keyframes page-open-draw \{\s*from \{ transform: scaleX\(0\); \}/);
    for (const [selector, keyframes] of [
      [".page-open-title", "page-open-rise"],
      [".page-open-sub", "page-open-fade"],
      [".page-open-rule", "page-open-draw"],
      [".page-open-after", "page-open-fade"],
      [".page-open-words > :nth-child(-n + 8)", "page-open-fade"],
    ]) {
      const body = new RegExp(`(^|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[2] ?? "";
      expect(body, selector).toContain(`animation: ${keyframes} `);
      // Filled backwards, so nothing keeps a transform or a stacking context.
      expect(body, selector).toMatch(/\bbackwards;/);
      expect(body, selector).not.toMatch(/\b(both|forwards)\b/);
    }
    expect(css).toMatch(/\.route-fade :is\(\.page-open-title, \.page-open-sub, \.page-open-rule, \.page-open-after, \.page-open-words\) \{\s*--page-open-start: var\(--duration-route-enter\);/);
    // The verses arrive in reading order, a tight step apart.
    expect(css).toContain("var(--line, 0) * var(--stagger-step-tight)");
    expect(css).toMatch(/\.page-open-words > :nth-child\(8\) \{ --line: 7; \}/);
    const reader = code("components/bible/ChapterReader.tsx");
    expect(reader).toContain('cn("page-open-words", flowing ? "reading-paragraphs" : "space-y-2")');
    // The first verse wears its number as every verse does: no drop cap.
    expect(reader).not.toContain("dropCap");
  });

  it("has its escape: with motion off the page is simply there", () => {
    const css = rules();
    for (const selector of [".page-open-title", ".page-open-sub", ".page-open-rule", ".page-open-after", ".page-open-words > :nth-child(-n + 8)"]) {
      expect(css, selector).toContain(`:where([data-motion="reduce"]) ${selector}`);
    }
    const escape = /:where\(\[data-motion="reduce"\]\) \.page-open-words > :nth-child\(-n \+ 8\) \{\s*animation: none;/.exec(css);
    expect(escape).not.toBeNull();
  });

  it("folds Before you read to one line under the title, opening in place", () => {
    const intro = screen.slice(screen.indexOf("{intro && introFacts ? ("), screen.indexOf("{intro && !introFacts"));
    expect(intro).toMatch(/^\{intro && introFacts \? \(\s*<details className="page-open-after group\/intro /);
    expect(intro).toMatch(/<summary[^>]*>\s*<T k="bible\.beforeYouRead" \/>/);
    // Closed until a tap: no `open` on either fold.
    expect(intro).not.toMatch(/<details\b[^>]*\sopen[\s>=]/);
    // Everything it held is still in it: what the book is, who wrote it and
    // when, and the longer word with its sources.
    for (const part of ["{introFacts.about}", '<T k="bible.introBy" />', '<T k="bible.introWhen" />', '<T k="bible.aboutThisBook" />', "marked(intro, introSources, INTRO_SOURCE)", '<SourceList id="intro-sources"']) {
      expect(intro, part).toContain(part);
    }
    expect(screen.indexOf("{intro && introFacts ? (")).toBeGreaterThan(screen.indexOf("</header>"));
    expect(screen.indexOf("{reader}")).toBeGreaterThan(screen.indexOf("{intro && introFacts ? ("));
  });
});

describe("the ••• sheet: what stood above the title and in the bar, one tap away", () => {
  const more = code(MORE);

  it("holds the search for a verse, the book's chapters, the translation, the book, the Greek, the bookmark and the app's search", () => {
    expect(more).toContain("<BibleSearch layer onNavigate={onClose} />");
    expect(more).toContain("<MobileChapterStrip book={bibleBook} current={chapter} onPick={onClose} />");
    expect(more).toMatch(/<SheetRow label=\{t\("bible\.translationLabel"\)\} value=\{current\.shortLabel\}/);
    expect(more).toMatch(/<SheetRow label=\{t\("bible\.bookLabel"\)\} value=\{name\}/);
    expect(more).toMatch(/\{showInterlinear \? \(\s*<ToggleRow on=\{greek\} touch label=\{t\("bible\.interlinearGreek"\)\} onClick=\{toggleGreek\} \/>/);
    expect(more).toMatch(/<ToggleRow on=\{saved\} touch label=\{t\("bible\.bookmarkThisChapter"\)\} onClick=\{toggleSaved\} \/>/);
    expect(more).toMatch(/label=\{t\("search\.ariaLabel"\)\}[\s\S]*?onClose\(\);\s*openSearch\(\);/);
    // The bookmark is the same one the computer's Save writes.
    expect(more).toMatch(/kind: "bible-chapter",\s*book,\s*bookName,\s*chapter,/);
  });

  it("goes first when it opens another sheet, so one sheet never opens over another", () => {
    expect(more).toMatch(/const go = \(to: "translation" \| "book"\) => \{\s*onClose\(\);\s*setNext\(to\);/);
    expect(more).toMatch(/<Sheet open=\{next === "translation"\}/);
    expect(more).toMatch(/<MobileChapterSheet open=\{next === "book"\}/);
  });

  it("opens the translations in a movable sheet, from the same list as the computer's popover", () => {
    expect(more).toMatch(/<TranslationList\b/);
    expect(more).toContain("useTranslationChoice(book, configuredLicensed)");
    const popover = code("components/bible/TranslationSwitcher.tsx");
    expect(popover).toMatch(/<TranslationList\b/);
    // One list, in lib/bible/translations.ts; no copy of it, and no badges.
    for (const file of ["components/bible/TranslationSwitcher.tsx", "components/bible/TranslationList.tsx", MORE]) {
      const src = code(file);
      expect(src, file).not.toMatch(/const TRANSLATIONS\b/);
      expect(src, file).not.toMatch(/translationBadge/);
    }
  });

  it("lights what is on white: a switch that is on, and the chapter being read", () => {
    const settings = code("components/bible/ReaderSettingsMenu.tsx");
    expect(settings).toContain('"reader-lit border-paper bg-paper text-night"');
    expect(settings).not.toMatch(/border-gold text-night bg-gold/);
    const strip = code("components/bible/MobileChapterStrip.tsx");
    expect(strip).toMatch(/<ChipScroller\b[^>]*bleed="phone"/);
    expect(strip).toMatch(/aria-current=\{active \? "page" : undefined\}/);
    expect(strip).toContain('"reader-lit bg-paper font-semibold text-night"');
    expect(strip).not.toMatch(/\bborder\b/);
    expect(rules()).toMatch(/\.reader-lit \{\s*box-shadow: 0 0 14px -2px rgb\(255 255 255 \/ 0\.42\);/);
  });

  it("opens search as a screen of its own, over the pill, down to the keyboard", () => {
    // The owner, 1.7.1: search on the Bible screen "conflicts with the bottom
    // and the Matthew one, or like the pill". The phone's and the tablet's
    // field opens a layer; the computer keeps its dropdown.
    const search = code("components/bible/BibleSearch.tsx");
    expect(search).toContain("data-bible-search-open");
    // Drawn on the body, so no wrapper of the page holds it under the pill
    // (the pill is z-40 and fixed) or the tab bar.
    expect(search).toMatch(/createPortal\(\s*<div\s+data-bible-search-layer/);
    expect(search).toContain("document.body,");
    expect(search).toContain('className="fixed inset-0 z-[120] bg-night"');
    expect(code(PILL)).toMatch(/fixed inset-x-0 z-40 /);
    // The results end where the keyboard begins.
    expect(search).toContain("const frame = useVisibleFrame();");
    expect(search).toContain("style={frame ? { top: frame.top, height: frame.height } : undefined}");
    // The tab bar and the way out of focus step aside, the page holds still,
    // and Cancel and the back button leave it.
    expect(search).toContain("setOverlayOpen(true);");
    expect(search).toContain("lockBodyScroll();");
    expect(search).toContain("useAndroidBack(true, onClose);");
    expect(search).toMatch(/onClick=\{onClose\}[\s\S]*?\{t\("common\.cancel"\)\}/);
    // A tap inside the layer must not close it as a tap outside the dropdown does.
    expect(search).toMatch(/if \(layer\) return;\s*function onDocClick/);
    // A result opened closes the ••• sheet under it.
    expect(search.match(/onNavigate\?\.\(\);/g)?.length).toBe(3);
  });
});

describe("the floating pill, with Listen", () => {
  const pill = code(PILL);

  it("turns the chapter, names it, and says the verse and the minutes left in a line over it", () => {
    expect(pill).toMatch(/<Arrow\s+target=\{prev\}/);
    expect(pill).toMatch(/<Arrow\s+target=\{next\}/);
    expect(pill).toContain('aria-label={t("bible.pickChapterCurrentAria", {');
    // Over the pill, not in it, so the pill keeps its width as the line opens.
    expect(pill).toMatch(/<ChapterVerseStatus chapterKey=\{`\$\{slug\}\/\$\{chapter\}`\} totalVerses=\{totalVerses\} \/>\s*<div\s+className=\{cn\(\s*"flex h-14 /);
    expect(pill).toContain("flex flex-col items-center gap-1.5 px-4");
    // The name gives way before the number does, and the pill never runs past the screen.
    expect(pill).toMatch(/<span className="truncate">\{bookName\}<\/span>\s*<span className="ms-1 shrink-0 tabular-nums">\{chapter\}<\/span>/);
    expect(pill).toContain("min-w-0 max-w-full");
    expect(code(SCREEN)).toContain("<MobileChapterPill slug={slug} chapter={chapter} totalVerses={totalVerses} />");
  });

  it("ends in Listen, after the sound button, only where the chapter has a reading", () => {
    expect(pill).toContain("const reads = useHasReadAloud(slug, chapter);");
    expect(pill).toMatch(/<AmbienceButton variant="pill" \/>\s*\{reads \? <ReadAloudPillButton book=\{slug\} chapter=\{chapter\} title=\{`\$\{bookName\} \$\{chapter\}`\} \/> : null\}\s*<\/div>/);
    const read = code("components/bible/ReadAloud.tsx");
    const button = read.slice(read.indexOf("export function ReadAloudPillButton"), read.indexOf("export function ReadAloudFollow"));
    // No reading, no button: never a dead one.
    expect(button).toContain("const available = useHasReadAloud(book, chapter);");
    expect(button).toContain("if (!available) return null;");
    // The same reading as the toolbar's Listen, played and paused through the one player.
    expect(button).toContain("await startReading(book, chapter, title, t);");
    expect(button).toMatch(/if \(playing\) pause\(\);\s*else play\(\);/);
    expect(button).toContain('const word = playing ? t("readAloud.pause") : t("readAloud.listen");');
    expect(button).toContain("aria-label={word}");
    // White, softly lit, its word giving way on the narrowest phones.
    expect(button).toMatch(/className="reader-lit [^"]*\bbg-paper\b[^"]*\btext-night\b/);
    expect(button).toMatch(/<span aria-hidden className="max-\[390px\]:hidden">\s*\{word\}/);
    // The verse being read is lit by the follower the screen already mounts.
    expect(code(SCREEN)).toContain("<ReadAloudFollow book={slug} chapter={chapter} />");
    // On the computer Listen joins the toolbar, as the reader's own pill.
    const toolbar = code(SCREEN).slice(code(SCREEN).indexOf('cn("hidden md:block native-md-hidden"'), code(SCREEN).indexOf("<RestoreTranslation"));
    expect(toolbar).toMatch(/\{!usingLicensed \? <ListenButton book=\{slug\} chapter=\{chapter\} bookName=\{book\.name\} \/> : null\}\s*<AmbienceButton variant="toolbar" \/>/);
    expect(read).toMatch(/<ReaderPill onClick=\{start\}/);
  });

  it("floats on a fade of the page, behind it, as drawn", () => {
    expect(pill).toContain('<span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -bottom-3 -z-10 h-44" />');
    expect(rules()).toMatch(/\.pill-fade \{\s*background: linear-gradient\(to bottom, transparent, var\(--color-night\) 72%\);/);
    // No blur behind the pill: it would be redrawn on every frame of a scroll.
    expect(pill).not.toMatch(/backdrop-blur/);
  });
});

describe("the plates and the pill step away as the reader reads on", () => {
  it("is watched once, by the screen, through lib/ui/scrollAway.ts", () => {
    expect(code(SCREEN)).toContain("useScrollAway();");
    expect(code("lib/ui/scrollAway.ts")).toContain('export const AWAY_ATTR = "data-reader-away";');
  });

  it("puts both away together, hidden once faded, and brings them back", () => {
    const css = rules();
    expect(css).toMatch(
      /body\[data-reader-away\] \[data-mobile-topbar\]\[data-plates\] \[data-plates-row\],\s*body\[data-reader-away\] \[data-reader-pill\] \{\s*opacity: 0;\s*visibility: hidden;/,
    );
    expect(css).toMatch(/body\[data-reader-away\] \[data-mobile-topbar\]\[data-plates\] \[data-plates-row\] \{\s*transform: translateY\(-8px\);/);
    expect(css).toMatch(/body\[data-reader-away\] \[data-reader-pill\] \{\s*transform: translateY\(12px\);/);
    // Visible at once on the way back, hidden only after the fade on the way out.
    expect(css).toMatch(/\[data-mobile-topbar\]\[data-plates\] \[data-plates-row\],\s*\[data-reader-pill\] \{\s*transition:[^}]*visibility 0s;/);
    expect(css).toMatch(/visibility 0s linear var\(--duration-fast\);/);
  });

  it("keeps a control the keyboard is on in sight, in a rule an old WebView may drop alone", () => {
    // A tapped button keeps the focus on Android; only the keyboard's holds them up.
    expect(rules()).toMatch(
      /body\[data-reader-away\] \[data-mobile-topbar\]\[data-plates\] \[data-plates-row\]:has\(:focus-visible\),\s*body\[data-reader-away\] \[data-reader-pill\]:has\(:focus-visible\) \{\s*opacity: 1;\s*visibility: visible;\s*transform: none;\s*\}/,
    );
    expect(rules()).not.toMatch(/data-reader-away[^{]*:focus-within/);
  });

  it("has its escape at the weight of each rule it quiets", () => {
    const css = rules();
    for (const selector of [
      "[data-mobile-topbar][data-plates] [data-plates-row],",
      "[data-reader-pill],",
      "body[data-reader-away] [data-mobile-topbar][data-plates] [data-plates-row],",
      "body[data-reader-away] [data-reader-pill] {\n transition: none;",
    ]) {
      expect(css, selector).toContain(`:where([data-motion="reduce"]) ${selector}`);
    }
  });
});

describe("the reader's pill and what rises over it", () => {
  // The owner, 1.7.1, a screenshot from the Android app: "pill buttons
  // colliding here", a hold's Copy pill on top of a work's section pill. A
  // hold's Copy pill, a verse's tools and the search screen all stand where
  // the pill is, so the pill steps aside while one is up, as the tab bar does.
  const pills = ["components/bible/MobileChapterPill.tsx", "components/saints/MobileWorkPill.tsx"];
  const PLACE = '"calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)"';

  it("steps aside while anything is up over the reader, and comes back after", () => {
    for (const file of pills) {
      const pill = code(file);
      expect(pill, file).toContain("const covered = useOverlayOpen();");
      expect(pill, file).toContain("aria-hidden={covered || undefined}");
      expect(pill, file).toMatch(/motion-safe:transition-opacity motion-safe:duration-200",\s*covered && "opacity-0",/);
      expect(pill, file).toContain('covered ? "pointer-events-none" : "pointer-events-auto"');
      expect(pill, file).toContain(PLACE);
    }
    // The tab bar has stepped aside the same way since the sheets.
    expect(code("components/nav/MobileTabBar.tsx")).toContain("overlayOpen && \"opacity-0\"");
  });

  it("is what the Copy pill, a verse's tools and search raise the flag for", () => {
    // Each stands in the pill's place, or over the whole screen.
    const copy = code("components/native/PressToCopy.tsx");
    expect(copy).toContain("setOverlayOpen(true);");
    expect(copy).toContain(PLACE);
    const tools = code("components/bible/MobileVerseToolbar.tsx");
    expect(tools).toContain("setOverlayOpen(true);");
    expect(tools).toContain(PLACE);
    expect(code("components/bible/BibleSearch.tsx")).toContain("setOverlayOpen(true);");
  });
});

describe("a tablet in the apps", () => {
  it("reads one centred column: no rail beside the text, the Fathers in the sheet", () => {
    const screen = code(SCREEN);
    expect(screen).toMatch(/"reader-grid native-md-block"/);
    expect(screen).toMatch(/rail && "lg:grid /);
    expect(screen).toMatch(/<aside className="hidden lg:block native-md-hidden" data-reader-chrome>/);
    // The computer's toolbar stays the computer's.
    expect(screen).toMatch(/cn\("hidden md:block native-md-hidden"/);
    const verse = code("components/bible/VerseRow.tsx");
    expect(verse.match(/hidden lg:inline-flex native-md-hidden/g)?.length).toBe(2);
    expect(verse.match(/lg:hidden native-md-inline-flex/g)?.length).toBe(2);
    expect(code("components/bible/MobileCommentarySheet.tsx")).toMatch(/lg:hidden native-md-block fixed inset-0/);
    expect(code("components/bible/LazyStudyRail.tsx")).toMatch(/if \(empty \|\| isNativeClient\(\)\) return;/);
  });

  it("keeps the phone's round buttons and pill, as a phone does", () => {
    expect(code(BAR)).toMatch(/className="md:hidden native-md-flex pointer-events-none fixed/);
    expect(code(PILL)).toMatch(/"md:hidden native-md-flex fixed inset-x-0 z-40 /);
  });

  it("lets the verses fill the column: no computer's toolbar laid out beside each verse", () => {
    // The owner's iPad, 1.7 on TestFlight: the column stood in the middle, but
    // the toolbar beside every verse (hidden md:flex, at opacity 0 until a
    // mouse hovers) was laid out unseen, about 170px wide, and the words
    // filled only the left of the column, 90px left of the screen's middle.
    // Section 43 of scripts/export-walk.mjs measures the words on every iPad.
    const verse = code("components/bible/VerseRow.tsx");
    expect(verse).toContain('"hidden md:flex native-md-hidden items-center gap-1 shrink-0');
    expect(verse).not.toMatch(/"hidden md:flex(?! native-md-hidden)/);
    // A Father's work, whose paragraphs mirror the verses, the same way.
    const paragraph = code("components/saints/ParagraphRow.tsx");
    expect(paragraph).toContain('"hidden md:flex native-md-hidden items-center gap-1 shrink-0');
    expect(paragraph).not.toMatch(/"hidden md:flex(?! native-md-hidden)/);
    // A tablet in the apps has the long-press toolbar instead, as a phone does.
    expect(code("components/bible/MobileVerseToolbar.tsx")).toMatch(/"md:hidden native-md-block fixed inset-0/);
  });

  it("gives its sheets a width of their own", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/html\.is-native \[data-sheet-panel\] \{\s*max-width: 560px;\s*margin-inline: auto;/);
    expect(code("components/ui/Sheet.tsx")).toMatch(/data-sheet-panel=\{desktop \? undefined : ""\}/);
    expect(code("components/bible/MobileCommentarySheet.tsx")).toMatch(/data-sheet-panel="wide"/);
  });
});

describe("focus mode", () => {
  const prefs = code("components/reader/ReaderPrefs.tsx");
  const css = read("app/globals.css");

  it("keeps its way out at the foot of the screen, never in the top right", () => {
    const exit = prefs.slice(prefs.indexOf("function FocusExit"), prefs.indexOf("function holdPlace"));
    expect(exit).toMatch(/data-reader-exit/);
    expect(exit).toMatch(/bottom:\s*\n?\s*"calc\(env\(safe-area-inset-bottom, 0px\)/);
    expect(exit).not.toMatch(/\b(top-3|right-3)\b/);
    expect(exit).not.toMatch(/backdrop-blur/);
    // It fades on its own and comes back on a tap, and only through the
    // reader's motion switch.
    expect(exit).toMatch(/motion-safe:transition-opacity/);
    expect(exit).toMatch(/pointercancel/);
    // Escape still leaves focus, from the controller.
    expect(prefs).toMatch(/if \(e\.key === "Escape"\) setFocus\(false\);/);
  });

  it("puts the round buttons, the chapter pill and the work pill away", () => {
    expect(css).toMatch(/html\.reader-focus \[data-mobile-topbar\] \{\s*display: none !important;/);
    expect(css).toMatch(/html\.is-native\.reader-focus \{\s*--tab-bar-h: 0px;/);
    for (const file of ["components/bible/MobileChapterPill.tsx", "components/saints/MobileWorkPill.tsx"]) {
      expect(code(file), file).toMatch(/aria-label=\{t\("[a-z.A-Z]+"\)\}\s*data-reader-chrome/);
    }
  });

  it("moves the progress line up to where the bar was, after the rules that place it under the bar", () => {
    const focus = css.indexOf("html.reader-focus .below-topbar");
    expect(focus).toBeGreaterThan(css.lastIndexOf("html:not(.is-native) .below-topbar"));
    expect(focus).toBeGreaterThan(css.indexOf("html.is-native .below-topbar"));
  });
});
