// The Florilegium redesigned as one piece (1.9, build 89 notes 6 and 12).
// The owner, 2026-11-10, of the starters: "The UX experience on these need to
// get fixed also, like these, this section and like where it leads to", and
// of the whole: "I also want the Florilegium, like entire design revamped. I
// just don't like that." The plan is docs/1.9-build/notes/florilegium-fable.md.
//
// What it holds:
//   the first page   a name in Lora with one small line, never a small label
//                    over a giant sentence; the reader's gatherings as rows in
//                    one raised tray; the starters under a real title, as
//                    picture tiles that open a page each.
//   a starter        a page of its own, in the apps and on the website, the
//                    tile's picture carried to its head, the passage set to
//                    read, one action. Keep stays on the page, and what was a
//                    tick with no word is "In your gatherings" with Open.
//   a gathering      a page of its own in the apps too, its lines on their own
//                    type, never boxed and never beside a rule.
//   gathering a line one sheet, wherever a line is gathered from, listing the
//                    reader's gatherings as the first page lists them.
//   the words        the two new lines, in all twenty-one languages.
//
// What a reader would notice if this broke: the grey boxes and the capitals
// back, a tile that opens a bare sheet, a Keep that throws them out of the
// passage, a tick they cannot read, or a line of English in Athens.
//
// What it does not hold: how it looks. That was looked at, on the export, in
// all five palettes (scripts/mock-florilegium.mjs, with checkMock).

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), useSearchParams: () => new URLSearchParams() }));
// The house's sheet draws nothing on a server (it opens into the page's own layer, on the device).
// A plain frame stands in for it here, so what the picker puts in the sheet can be read.
vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) =>
    open ? createElement("section", { role: "dialog" }, createElement("h2", null, title), children) : null,
}));

import { FlorilegiaHub } from "@/components/florilegium/FlorilegiaHub";
import { ItemCard } from "@/components/florilegium/FlorilegiumDetail";
import { FlorilegiumPickerSheet } from "@/components/florilegium/FlorilegiumPickerSheet";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { StarterPage } from "@/components/florilegium/StarterPage";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { itemSource } from "@/lib/florilegium/asText";
import type { FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { starterHref } from "@/lib/florilegium/href";
import { keptStarter, STARTERS, starterById } from "@/lib/florilegium/starters";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const catalog = (c: string) => JSON.parse(read(`lib/i18n/messages/${c}.json`)) as Record<string, string>;

type ProviderProps = Parameters<typeof MessagesProvider>[0];
function render(node: ReactElement, lang = "en"): string {
  return renderToString(createElement(MessagesProvider, { locale: lang, messages: getMessages(lang) } as ProviderProps, node));
}
/** What React writes for a piece of text. */
const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
/** The words a reader sees, tags gone. */
const words = (out: string) => out.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const HUB = "components/florilegium/FlorilegiaHub.tsx";
const STARTER = "components/florilegium/StarterPage.tsx";
const DETAIL = "components/florilegium/FlorilegiumDetail.tsx";
const GATE = "components/florilegium/PlusGate.tsx";
const PAGE = "app/(app)/florilegium/page.tsx";
const SCREENS = [
  HUB,
  STARTER,
  DETAIL,
  GATE,
  PAGE,
  "components/billing/plusTry/TryFlorilegium.tsx",
  "components/florilegium/GatheringRow.tsx",
  "components/florilegium/FlorilegiumPickerSheet.tsx",
  "components/florilegium/AddToFlorilegium.tsx",
];
const EN = catalog("en");
const CODES = LOCALES.map((l) => l.code);

describe("the first page", () => {
  it("names itself in Lora with one small line, and closes with the long paragraph in small type", () => {
    const page = code(PAGE);
    expect(page).toContain('<h1 id="florilegium-title" className={FLOR_H1}>');
    expect(page).toContain('<T k="study.florilegium.title" />');
    expect(page).toContain('<T k="study.florilegium.lead" />');
    expect(page).toContain('<T k="study.florilegium.definition" />');
    // The paragraph that stood under the old headline is the page's closing note, the same words.
    const note = page.slice(page.indexOf("data-florilegium-note"));
    expect(note).toContain('<T k="study.keepTheLinesThatStrike" />');
    expect(page.indexOf("<FlorilegiumGate />")).toBeLessThan(page.indexOf("data-florilegium-note"));
    // No small label over a giant sentence, and no glow drawn by hand.
    for (const gone of ["<Eyebrow", "text-display", "text-heading", "page-halo", "radial-gradient"]) expect(page, gone).not.toContain(gone);
    expect(read("components/florilegium/florStyle.ts")).toContain('FLOR_H1 = "font-serif text-title font-bold');
  });

  it("lists the reader's gatherings as rows in one raised tray, the last of them beginning a new one", () => {
    const hub = code(HUB);
    expect(hub).toContain('<ul className={cn(FLOR_TRAY, "mt-2.5")} data-florilegium-yours="">');
    expect(hub).toContain("<GatheringRow f={f} />");
    expect(hub).toContain('data-florilegium-begin="" className={FLOR_ROW}');
    // A row says what the gathering is by what is in it: its newest line, and how many it keeps.
    const row = hub.slice(hub.indexOf("function GatheringRow"));
    expect(row).toContain("href={gatheringHref(f.id)}");
    // The row is a place to go, so a picture it wears travels to the page (F1).
    expect(row).toContain("<GatheringRowBody f={f} carry />");
    const body = code("components/florilegium/GatheringRow.tsx");
    expect(body).toContain("{newest.text}");
    expect(body).toContain('tn("study.florilegium.lineCount", f.items.length)');
    // The boxes are gone, and nothing is a floating pill.
    for (const gone of ["GatheringCard", "border-dashed", "min-h-[156px]", "grid-cols-2 gap-3 lg:grid-cols-3"]) expect(hub, gone).not.toContain(gone);
  });

  it("gives every part a real title, never a label in capitals", () => {
    const hub = code(HUB);
    expect(hub).toContain('<h2 id="florilegium-yours" className={FLOR_H2}>');
    expect(hub).toContain('<h2 id="florilegium-starters" className={FLOR_H2}>');
    for (const file of SCREENS) {
      const src = code(file);
      expect(src, file).not.toMatch(/\buppercase\b/);
      expect(src, file).not.toContain("text-eyebrow");
      expect(src, file).not.toContain("<Eyebrow");
    }
    expect(read("components/florilegium/florStyle.ts")).toContain('FLOR_H2 = "font-serif ');
  });

  it("draws the starters as picture tiles that open a page each, a kept one saying so in words", () => {
    const hub = code(HUB);
    expect(hub).toContain("href={starterHref(s.id)}");
    expect(hub).toContain('{t("study.florilegium.inYours")}');
    // No sheet, and no going anywhere but the starter's page.
    for (const gone of ["StarterSheet", "<Sheet", "@/components/ui/Sheet", "aria-haspopup", "useRouter", "router.push"]) expect(hub, gone).not.toContain(gone);
    const out = render(createElement(FlorilegiaHub));
    for (const s of STARTERS) {
      expect(out, s.id).toContain(`href="${starterHref(s.id)}"`);
      expect(out, s.id).toContain(html(EN[s.nameKey]));
    }
    expect(out).toContain(">Begin with a gathering</h2>");
    expect(out).toContain(">Your gatherings</h2>");
    expect(out).toContain("John 1:1-18");
  });

  it("writes no arrow and no tick as a letter, on any of its screens", () => {
    for (const file of SCREENS) expect(code(file), file).not.toMatch(/[→←↗✓✔×]/);
  });
});

describe("a starter's page", () => {
  it("is a page for each of the four, known to every build", () => {
    const page = read("app/(app)/florilegium/begin/[starter]/page.tsx");
    expect(page).toContain("return STARTERS.map((s) => ({ starter: s.id }));");
    expect(page).toContain("export const dynamicParams = false;");
    expect(page).toContain('<MobileTopBar titleKey={s.nameKey} back backFallback="/florilegium" revealTitleOn="florilegium-title" />');
    // The id alone crosses to the device: the passage is not written into the page twice as a prop.
    expect(page).toContain("<StarterPage id={s.id} />");
    for (const s of STARTERS) expect(starterById(s.id)).toBe(s);
    expect(starterById("no-such")).toBeUndefined();
  });

  it("shows the passage whole, a verse a line, with its name, where it is from and how long it is", () => {
    const s = STARTERS[1];
    const out = render(createElement(StarterPage, { id: s.id }));
    expect(out).toContain(">The Beatitudes</h1>");
    expect(words(out)).toContain("Matthew 5:3-12 · 10 lines");
    for (const l of s.lines) expect(out, String(l.verse)).toContain(html(l.text));
    expect(out.match(/<li /g)).toHaveLength(s.lines.length);
    // The Bible's words are English, whatever the page's language, and say so.
    // And are set from the left where the page reads from the right.
    expect(out).toContain('<ol lang="en" dir="ltr"');
    expect(render(createElement(StarterPage, { id: "no-such" }))).toBe("");
  });

  it("has one action, and it is the reader's language's", () => {
    const out = render(createElement(StarterPage, { id: "prologue" }));
    expect(out.match(/data-starter-keep/g)).toHaveLength(1);
    expect(out).toContain(">Keep this gathering</button>");
    expect(out.match(/<button/g)).toHaveLength(1);
    for (const c of ["el", "ru", "ar", "ka"]) {
      const said = render(createElement(StarterPage, { id: "prologue" }), c);
      expect(said, c).toContain(html(catalog(c)["study.florilegium.keepStarter"]));
      expect(said, c).not.toContain("Keep this gathering");
    }
  });

  it("keeps on the page: nothing leaves it, and what was kept is said in words with the way to open it", () => {
    const src = code(STARTER);
    for (const gone of ["useRouter", "router.push", "window.location"]) expect(src, gone).not.toContain(gone);
    // Plus is asked first, and a reader without it meets the sheet named for the Florilegium.
    const keep = src.slice(src.indexOf("function keep("), src.indexOf("return (", src.indexOf("function keep(")));
    expect(keep.indexOf("plusFeaturesNow()")).toBeGreaterThan(-1);
    expect(keep.indexOf('upgrade.open("florilegium")')).toBeLessThan(keep.indexOf("const id = create("));
    expect(keep).toContain("if (keeping.current) return;");
    // Kept: the row, its words, Open, and the reader's own copy behind it.
    const kept = src.slice(src.indexOf("{kept ? ("), src.indexOf(") : locked ? ("));
    expect(kept).toContain("href={gatheringHref(kept.id)}");
    expect(kept).toContain('{t("study.florilegium.inYours")}');
    expect(kept).toContain('{t("journal.composer.open")}');
    expect(kept).not.toContain("data-starter-keep");
  });

  it("knows the reader's own copy by the name and the reference Keep wrote", () => {
    const mine = [
      { id: "a", title: "On the light" },
      { id: "b", title: "The Prologue of John", description: "John 1:1-18" },
    ];
    expect(keptStarter(mine, "The Prologue of John", "John 1:1-18")?.id).toBe("b");
    expect(keptStarter(mine, "The Prologue of John", "John 1:1-17")).toBeUndefined();
    expect(keptStarter(mine, "The Beatitudes", "Matthew 5:3-12")).toBeUndefined();
  });

  it("takes the tile's picture to its head: the same picture named on both", () => {
    expect(code(HUB)).toContain("<span data-carry={picture.src}");
    expect(code(STARTER)).toContain("data-carry-into={picture.src}");
    const tile = /data-carry="([^"]+)"/.exec(render(createElement(FlorilegiaHub)))?.[1];
    const head = /data-carry-into="([^"]+)"/.exec(render(createElement(StarterPage, { id: STARTERS[0].id })))?.[1];
    expect(tile).toBeTruthy();
    expect(head).toBe(tile);
  });
});

describe("a gathering's page", () => {
  const verse: FlorilegiumItem = { id: "v", addedAt: 0, kind: "scripture", text: "And the light shineth in darkness; and the darkness comprehended it not.", reference: "John 1:5", book: "john", chapter: 1, verse: 5, note: "Read at Pascha." };

  it("sets a line on its own type: no box, no icon tile, no rule beside it", () => {
    const src = code(DETAIL);
    for (const gone of ["@/components/ui/Graphite", "CARD", "ICON_TILE", "border-s", "border-l", "ps-4 border"]) expect(src, gone).not.toContain(gone);
    const out = render(createElement(ItemCard, { item: verse, onRemove: () => {}, onNote: () => {} }));
    // Upright, in the size the app reads at: a page of them in italics tires the eye.
    // Each line reads its own way, whatever language it was gathered in.
    expect(out).toContain('<blockquote dir="auto" class="font-serif text-[17px] leading-[1.7] text-paper/90">');
    expect(out).toContain(html(verse.text));
    // At the verse, not at its chapter's first line (build 93 note 19; lib/florilegium/href.ts).
    expect(out).toContain('href="/bible/john/1#v5"');
    expect(out).toContain('<span dir="auto" class="min-w-0">John 1:5</span>');
    expect(out).toContain(">Your note</p>");
    expect(words(out)).toContain("Your note Read at Pascha.");
    expect(out).toContain(">Edit note</button>");
    expect(out).toContain(">Remove</button>");
  });

  it("read only, shows the line and its note and nothing to do", () => {
    const out = render(createElement(ItemCard, { item: verse, readOnly: true, onRemove: () => {}, onNote: () => {} }));
    expect(out).toContain(html(verse.text));
    expect(words(out)).toContain("Read at Pascha.");
    expect(out).not.toContain("<button");
  });

  it("heads itself with its name in Lora and how many lines it keeps, with one way back on a phone", () => {
    const src = code(DETAIL);
    expect(src).toContain('<h1 id={FLOR_TITLE} dir="auto" className={cn(FLOR_H1, "text-balance")}>');
    expect(src).toContain('tn("study.florilegium.lineCount", f.items.length)');
    // The bar is the way back on a phone; the link under it was a second one.
    expect(src).toContain('<p className="mb-6 hidden md:block native-md-hidden">');
    expect(src).not.toContain("PILL");
    // Nothing is said of a gathering before the device's own list has been read.
    expect(src).toContain("if (!mounted) return null;");
    // One that is not here has no name to head its page, and the bar's is for the eye alone:
    // the page still has a heading for a screen reader, unseen, so it looks as it did.
    expect(src).toMatch(/<div className="pt-6 text-center" data-gathering-gone="">\s*<h1 className="sr-only">\{t\("study\.florilegium\.title"\)\}<\/h1>\s*<p className="font-serif text-lede italic/);
  });

  it("is a page with its own bar at both of its addresses, which takes the gathering's own name", () => {
    // The bar is the gathering's (F2), at both addresses, and the gathering says which it is.
    const onTheWeb = code("app/(app)/florilegium/[id]/page.tsx");
    const inApps = code("app/(app)/florilegium/gathering/page.tsx");
    for (const page of [onTheWeb, inApps]) expect(page).toContain("<GatheringBar />");
    // In the apps the query is read on the device, in a boundary; the bar is not in it, nor in one of its own.
    expect(inApps.match(/<Suspense /g)).toHaveLength(1);
    expect(inApps).toMatch(/<Suspense fallback=\{null\}>\s*<FlorilegiumByQuery \/>\s*<\/Suspense>/);
    expect(inApps.indexOf("<GatheringBar />")).toBeLessThan(inApps.indexOf("<Suspense "));
    const bar = code("components/florilegium/GatheringBar.tsx");
    // Its name once the name has gone up under the bar, and the way back to the gatherings.
    expect(bar).toContain("const open = useGatheringNow();");
    expect(bar).toContain('<MobileTopBar key={`gathering:${open.id}`} title={open.title} titles={{ [locale]: open.title }} back backFallback="/florilegium" revealTitleOn={FLOR_TITLE} />');
    // With no gathering on the screen (the device not read yet, one it does not keep) the bar is the Florilegium's.
    expect(bar).toContain('if (!open) return <MobileTopBar key="florilegium" titleKey="study.florilegium.title" back backFallback="/florilegium" revealTitleOn={FLOR_TITLE} />;');
    // The name reaches the bar a moment after the page (a transition holds it back), so the two bars are
    // the same to the eye at the top of a page: both wait for the gathering's heading, and none shows a
    // name over it. And the bar that knows its gathering is a new one, which looks for the heading afresh.
    expect(bar.match(/revealTitleOn=\{FLOR_TITLE\}/g)).toHaveLength(2);
    expect(bar.match(/<MobileTopBar key=/g)).toHaveLength(2);
    // The gathering says it as it is drawn and takes it away as it goes, before the page is painted.
    const detail = code(DETAIL);
    expect(detail).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*if \(openId === undefined \|\| openTitle === undefined\) return;\s*showGathering\(openId, openTitle\);\s*return \(\) => hideGathering\(openId\);\s*\}, \[openId, openTitle\]\);/);
    expect(detail).toContain("const openId = f?.id;");
    expect(detail).toContain("const openTitle = f?.title;");
    // The heading the bar waits for is the gathering's own.
    expect(detail).toContain("<h1 id={FLOR_TITLE}");
  });
});

describe("the sheet that picks a gathering", () => {
  const PICKER = "components/florilegium/FlorilegiumPickerSheet.tsx";
  const line = { kind: "scripture" as const, text: "And the light shineth in darkness; and the darkness comprehended it not.", reference: "John 1:5", book: "john", chapter: 1, verse: 5 };

  it("is the one way to gather: a verse's tools and the Gather button both open it", () => {
    expect(code("components/bible/VerseRow.tsx")).toContain("<FlorilegiumPickerSheet");
    expect(code("components/florilegium/AddToFlorilegium.tsx")).toContain("<FlorilegiumPickerSheet");
    // The button's own menu is gone, with its look of its own.
    const button = code("components/florilegium/AddToFlorilegium.tsx");
    for (const gone of ['role="menu"', "backdrop-blur", "bg-gold", "text-gold", "border-white", "bg-white", "useFlorilegia"]) expect(button, gone).not.toContain(gone);
  });

  it("lists the reader's gatherings as the first page lists them, the last row beginning a new one", () => {
    const picker = code(PICKER);
    expect(picker).toContain('<ul className={FLOR_TRAY} data-gather-into="">');
    expect(picker).toContain("<GatheringRowBody f={f} gathered={into === f.id} />");
    expect(code(HUB)).toContain("<GatheringRowBody f={f} carry />");
    expect(picker).toContain('data-florilegium-begin="" className={FLOR_ROW}');
    expect(picker).toContain('{t("study.florilegium.beginNew")}');
    // It has a field, so it stands on the keyboard; and the field lights its own fill, nothing round it.
    expect(picker).toContain('title={t("study.florilegium.gatherInto")} desktop keyboard');
    expect(picker).toContain("className={cn(FLOR_FIELD,");
    for (const gone of ["bg-gold", "text-gold", "border-white", "bg-white", "focus:outline-none", "focus:border-", "text-left", "text-paper/35", "text-paper/45", "beginNewEllipsis", "max-h-["]) {
      expect(picker, gone).not.toContain(gone);
    }
  });

  it("shows the line as it will stand in its gathering: its words, and where they are from", () => {
    const out = render(createElement(FlorilegiumPickerSheet, { open: true, item: line, onClose: () => {} }));
    expect(out).toContain("<h2>Gather into</h2>");
    expect(out).toContain('<blockquote dir="auto" class="line-clamp-3 font-serif text-[15px] leading-[1.6] text-paper/90">');
    expect(out).toContain(html(line.text));
    expect(out).toContain(">John 1:5</span>");
    // A reader with no gathering yet is told so, and can begin one.
    expect(out).toContain(html(EN["study.florilegium.youHaveNone"]));
    expect(out).toContain(">Begin a new gathering</span>");
    expect(itemSource({ kind: "father", text: "x", author: "St. Basil the Great", work: "Letter 234" })).toBe("St. Basil the Great, Letter 234");
  });

  it("stays a moment to show where the line went, then closes itself, and takes one tap only", () => {
    const picker = code(PICKER);
    expect(picker).toContain("const SHOWN_MS = 750;");
    const gathered = picker.slice(picker.indexOf("function gathered("), picker.indexOf("function gatherInto("));
    expect(gathered).toContain("onGathered?.(name);");
    expect(gathered).toContain("setInto(id);");
    expect(gathered).toMatch(/window\.setTimeout\(\(\) => \{\s*closing\.current = null;\s*onClose\(\);\s*\}, SHOWN_MS\);/);
    expect(picker.match(/if \(into !== null\) return;/g)).toHaveLength(2);
    // Every opening starts clean, and a sheet taken away mid-wait leaves no timer behind.
    expect(picker).toContain("setInto(null);");
    expect(picker).toContain("if (closing.current !== null) window.clearTimeout(closing.current);");
    // Said aloud, in the catalog's words.
    expect(picker).toContain('aria-live="polite"');
    expect(picker).toContain('t("study.florilegium.gatheredInto", { name:');
  });

  it("says its words in the reader's language", () => {
    for (const c of ["el", "ru", "ar", "ka"]) {
      const out = render(createElement(FlorilegiumPickerSheet, { open: true, item: line, onClose: () => {} }), c);
      const said = catalog(c);
      for (const key of ["study.florilegium.gatherInto", "study.florilegium.beginNew", "study.florilegium.youHaveNone"]) {
        expect(out, `${c} ${key}`).toContain(html(said[key]));
        expect(said[key], `${c} ${key}`).not.toBe(EN[key]);
      }
    }
  });
});

describe("the card a reader without Plus meets", () => {
  it("is drawn on the house's tray, and says what is theirs stays theirs", () => {
    const out = render(createElement(PlusGate, { titleKey: "plus.florilegium.title", blurbKey: "plus.florilegium.body", modalFeature: "florilegium" }));
    expect(out).toContain("theology-tray");
    expect(out).toContain(">Your collections are part of Purify Plus</h2>");
    expect(out).toContain(html(EN["study.everythingYouHaveAlreadyGathered"]));
    expect(out.match(/<button/g)).toHaveLength(1);
    expect(code(GATE)).not.toContain("@/components/ui/Graphite");
  });
});

describe("the new words", () => {
  it("are in all twenty-one catalogs, each in its own words, beside the Florilegium's other lines", () => {
    expect(CODES).toHaveLength(21);
    expect(EN["study.florilegium.yours"]).toBe("Your gatherings");
    expect(EN["study.florilegium.inYours"]).toBe("In your gatherings");
    for (const c of CODES) {
      const said = catalog(c);
      const keys = Object.keys(said);
      // "Your gatherings" is each catalog's own line of 1.8, without its typed arrow.
      expect(said["study.florilegium.yours"], c).toBe(said["study.florilegium.yoursArrow"].replace(/\s*[→←]\s*/g, "").trim());
      expect(keys.indexOf("study.florilegium.yours"), c).toBe(keys.indexOf("study.florilegium.yoursArrow") + 1);
      expect(keys.indexOf("study.florilegium.inYours"), c).toBe(keys.indexOf("study.florilegium.yours") + 1);
      for (const key of ["study.florilegium.yours", "study.florilegium.inYours"]) {
        expect(said[key]?.trim(), `${c} ${key}`).toBeTruthy();
        expect(said[key], `${c} ${key}`).not.toMatch(/[→←{}]/);
        if (c !== "en") expect(said[key], `${c} ${key} is not the English copied`).not.toBe(EN[key]);
      }
      expect(said["study.florilegium.inYours"], c).not.toBe(said["study.florilegium.yours"]);
    }
  });

  it("are the only new ones: every other line on these screens was the catalogs' already", () => {
    const asked = new Set<string>();
    for (const file of SCREENS) {
      for (const m of code(file).matchAll(/\b(?:t|tn)\("([a-zA-Z0-9_.]+)"/g)) asked.add(m[1]);
      for (const m of code(file).matchAll(/<T k="([a-zA-Z0-9_.]+)"/g)) asked.add(m[1]);
    }
    expect(asked.size).toBeGreaterThan(12);
    for (const key of asked) {
      const plural = `${key}.one` in EN || `${key}.other` in EN;
      expect(key in EN || plural, key).toBe(true);
    }
  });
});
