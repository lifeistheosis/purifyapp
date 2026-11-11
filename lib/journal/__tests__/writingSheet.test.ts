import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { JournalDraft } from "@/lib/journal/entries";
import { emptyQuoteAt, highlightTarget, parsePage, serializePage, verseAt, verseBlock, type Page, type PageBlock } from "@/lib/journal/page";
import { draftWithQuote } from "@/lib/journal/quoteInJournal";

/**
 * The journal's writing sheet does what a finger means (build 93 note 8, the
 * owner on 2026-11-11: "when I click title or anything ... Honestly, just
 * buggy", and a minute later, of Verse, Quote, Highlight and More: "that same
 * bug happens in each of these sections. I want all of it refined").
 *
 * What a walk of the export with a finger's taps found, and what this holds:
 *
 *   a finger comes first    Title tapped in the first third of a second took
 *                           the cursor and lost it to the words, because the
 *                           sheet's own timer ran whatever the reader had
 *                           done. It gives way to a finger now.
 *   no door under Title     "Add to a notebook" stood under every title,
 *                           touching it, and for a reader without Plus it
 *                           opens the Plus sheet. The line stands there only
 *                           once the page has a notebook or tags; the door
 *                           is in More, with Plus's other choices.
 *   the page is not a       a pull that began on a field moved the whole
 *   handle                  sheet. Only the sheet's head drags it.
 *   one empty quote         Quote laid a new empty card at every tap.
 *   a verse once            the same verse could be laid twice.
 *   the place to write      said nothing once a card was on the page.
 *   a kind keeps the        a tap on Reflection, Prayer or Question took the
 *   cursor                  cursor from the field; and they were pills.
 *   a quote keeps the       Quote in journal wrote the page back as a title
 *   page's own              and blocks alone: its notebook, tags, style and
 *                           cover were lost.
 *   the journal's door      on You the journal's cover still wore the Plus
 *   is open                 lock, though writing is free from 1.9.
 *   Highlight says why      with nothing to mark it went dim and said
 *                           nothing; with the cursor on an empty line it
 *                           took a colour no one could see. It is lit, and
 *                           with nothing written says so in one line. And a
 *                           colour chosen left the cursor nowhere: the
 *                           colours hold it now, as the tools do.
 *
 * The walk itself is scripts/mock-journal.mjs, on the native export.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const composer = read("components/journal/JournalComposer.tsx");
const blocks = read("components/journal/PageBlocks.tsx");
const hook = read("components/journal/usePage.ts");
const code = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const text = (t: string): PageBlock => ({ type: "text", text: t });
const quote = (t: string, by = ""): PageBlock => ({ type: "quote", text: t, by });
const john316 = verseBlock("john", 3, 16)!;

describe("one empty quote at a time", () => {
  it("knows where an empty quote waits", () => {
    expect(emptyQuoteAt([text("")])).toBe(-1);
    expect(emptyQuoteAt([quote(""), text("")])).toBe(0);
    expect(emptyQuoteAt([text("Words"), quote("Acquire the Spirit of peace"), quote(""), text("")])).toBe(2);
    // Spaces alone are still empty.
    expect(emptyQuoteAt([quote("  \n "), text("")])).toBe(0);
  });

  it("a quote with its giver named and no words yet is not empty: the writer has begun it", () => {
    expect(emptyQuoteAt([quote("", "St Seraphim"), text("")])).toBe(-1);
    expect(emptyQuoteAt([quote("Acquire the Spirit of peace"), text("")])).toBe(-1);
  });

  it("Quote goes to the one waiting, and lays a card only when none waits", () => {
    const tool = code(blocks).slice(code(blocks).indexOf('label={t("journal.page.addQuote")}'));
    expect(tool).toMatch(/const at = emptyQuoteAt\(editor\.page\.blocks\);\s*if \(at >= 0\) editor\.focusBlock\(at\);\s*else editor\.insert\(\{ type: "quote", text: "", by: "" \}\);/);
    // And the editor can hand the cursor to a block already on the page.
    expect(hook).toMatch(/const focusBlock = \(index: number, field\?: "input"\) => \{\s*focusAsk\.current = \{ index, at: "end", field \};/);
  });
});

describe("a verse is laid once", () => {
  it("knows the same verses of the same chapter, and no others", () => {
    const page = [text("Words"), john316, text("")];
    expect(verseAt(page, verseBlock("john", 3, 16)!)).toBe(1);
    expect(verseAt(page, verseBlock("john", 3, 17)!)).toBe(-1);
    expect(verseAt(page, verseBlock("john", 3, 16, 17)!)).toBe(-1);
    expect(verseAt(page, verseBlock("1-john", 3, 16)!)).toBe(-1);
    expect(verseAt(page, verseBlock("john", 4, 16)!)).toBe(-1);
    // Only a verse card is a verse: a quote of the same words is the writer's own.
    expect(verseAt(page, quote("For God so loved the world"))).toBe(-1);
    expect(verseAt([text("")], john316)).toBe(-1);
  });

  it("asked for again, its card is shown and lit for a moment, and nothing is laid", () => {
    const finder = code(blocks).slice(code(blocks).indexOf("<VerseFinder"), code(blocks).indexOf("<VerseFinder") + 400);
    expect(finder).toMatch(/const at = verseAt\(editor\.page\.blocks, b\);\s*if \(at >= 0\) editor\.show\(at\);\s*else editor\.insert\(b\);\s*setPanel\(null\);/);
    expect(hook).toMatch(/const show = \(index: number\) => \{\s*setNoticed\(index\);/);
    expect(hook).toContain('scrollIntoView({ block: "nearest" })');
    // Lit for a moment, and never left lit: by its own clock, and when the sheet closes.
    expect(hook).toMatch(/const id = window\.setTimeout\(\(\) => setNoticed\(null\), 1400\);/);
    expect(hook).toMatch(/if \(open !== wasOpen\) \{[\s\S]*?setNoticed\(null\);\s*\}/);
    expect(blocks).toContain("noticed={editor.noticed === i}");
    expect(blocks).toContain('data-page-noticed={noticed ? "" : undefined}');
  });
});

describe("the place to write always says so", () => {
  it("the last words carry the placeholder whenever they are empty, whatever else is on the page", () => {
    expect(blocks).toContain("placeholder={last ? placeholder : undefined}");
    // It was said only on a page with nothing else on it.
    expect(blocks).not.toContain("onlyWords");
    // A placeholder shows only in an empty field, so words already written are never covered.
    expect(blocks).toMatch(/<textarea dir="auto"[\s\S]*?placeholder=\{placeholder\}/);
  });
});

describe("a finger comes first", () => {
  it("the sheet's own timer does nothing once a finger has been put down", () => {
    const effect = composer.slice(composer.indexOf("let touched = false;"), composer.indexOf("}, [open, isNote, setCursor]);"));
    expect(effect).toMatch(/const onDown = \(\) => \{\s*touched = true;\s*\};\s*document\.addEventListener\("pointerdown", onDown, true\);/);
    // Asked before anything is moved.
    expect(effect.indexOf("if (touched) return;")).toBeGreaterThan(-1);
    expect(effect.indexOf("if (touched) return;")).toBeLessThan(effect.indexOf("el.focus({ preventScroll: true });"));
    // And nothing is left listening: when the timer comes, and when the sheet goes first.
    expect(effect.match(/document\.removeEventListener\("pointerdown", onDown, true\);/g)).toHaveLength(2);
    expect(effect).toMatch(/return \(\) => \{\s*window\.clearTimeout\(id\);\s*document\.removeEventListener\("pointerdown", onDown, true\);\s*\};/);
  });

  it("a kind holds the cursor where it is, as a tool does", () => {
    const kinds = composer.slice(composer.indexOf('data-journal-kinds=""'), composer.indexOf("{t(KIND_KEY[k])}"));
    expect(kinds).toContain("onPointerDown={(e) => e.preventDefault()}");
    expect(kinds).toContain('role="radio"');
    expect(kinds).toContain("aria-checked={draft.kind === k}");
  });

  it("the kinds are the house's switch, one rounded row with the chosen part filled, and not three pills", () => {
    const sw = read("components/ui/SegmentedSwitch.tsx");
    const row = "no-scrollbar grid grid-flow-col auto-cols-[minmax(max-content,1fr)] gap-1 overflow-x-auto rounded-pill border border-paper/10 bg-paper/[0.03] p-1";
    const part = "tap-press min-h-11 min-w-11 whitespace-nowrap rounded-pill px-1 font-sans text-detail font-semibold motion-safe:transition-colors";
    // The same classes as the switch itself, so the two cannot drift apart.
    expect(sw).toContain(row);
    expect(sw).toContain(part);
    expect(composer).toContain(`mt-4 ${row.replace("no-scrollbar ", "")}`);
    expect(composer).toContain(part);
    const kinds = composer.slice(composer.indexOf('data-journal-kinds=""'), composer.indexOf("{t(KIND_KEY[k])}"));
    expect(kinds).not.toMatch(/border px-4|hit-44|min-h-9|flex-wrap/);
  });
});

describe("the page is not a handle", () => {
  it("a finger put down in the page never drags the sheet; its head still does", () => {
    expect(composer).toContain('<div data-journal-composer="" data-sheet-nodrag="">');
    const sheet = read("lib/ui/useDraggableSheet.ts");
    // The body's pull from its top steps aside for it, and the head is held by its own handlers.
    expect(sheet).toMatch(/const onStart = \(e: TouchEvent\) => \{[\s\S]*?if \(\(e\.target as Element \| null\)\?\.closest\?\.\("\[data-sheet-nodrag\]"\)\) return;/);
    expect(composer).toMatch(/<Sheet[\s\S]*?header=\{header\}/);
  });
});

describe("no door to Plus under Title", () => {
  it("the line under the title stands only once the page has a notebook or tags", () => {
    expect(blocks).toContain("const hasProps = !!page.notebook || (page.tags?.length ?? 0) > 0;");
    expect(code(blocks)).toMatch(/\{hasProps \? \(\s*<button\s+type="button"\s+data-page-props=""/);
    const line = blocks.slice(blocks.indexOf('data-page-props=""'), blocks.indexOf('data-page-props=""') + 900);
    // It names what the page has, and never offers what it has not.
    expect(line).not.toContain('t("journal.page.addToNotebook")');
    expect(line).toContain("page.notebook");
  });

  it("the door is in More, in a tray of its own under the blocks, with the Plus mark and the journal's own sheet without Plus", () => {
    const more = code(blocks).slice(code(blocks).indexOf('data-page-more=""'), code(blocks).indexOf('role="toolbar"'));
    expect(more).toMatch(/<MoreChoice\s+page\s+icon=\{<ClosedBook size=\{18\} \/>\}\s+label=\{editor\.page\.notebook \|\| t\("journal\.page\.addToNotebook"\)\}\s+locked=\{locked\}/);
    expect(more).toMatch(/if \(locked\) \{\s*setPanel\(null\);\s*upgrade\.open\("journal"\);\s*\} else setPanel\("props"\);/);
    const choice = blocks.slice(blocks.indexOf("function MoreChoice"), blocks.indexOf("function Tool("));
    expect(choice).toContain("{locked ? <PlusMark");
    expect(choice).toContain("min-h-12");
    // It holds the cursor, as every tool does.
    expect(choice).toContain("onPointerDown={(e) => e.preventDefault()}");
  });
});

describe("More's choices can be read", () => {
  // The walk on an export that sells Plus, as a new reader: the four tiles two across read "H...", "C...",
  // "D..." and "C...", because the Plus mark took the room. Measured with the export's fonts, the padlock
  // alone still cut a word in five languages on a 360px phone, and in sixteen on 320px.
  const more = code(blocks).slice(code(blocks).indexOf('data-page-more=""'), code(blocks).indexOf('role="toolbar"'));
  const choice = blocks.slice(blocks.indexOf("function MoreChoice"), blocks.indexOf("function Tool("));

  it("they are rows the width of the sheet, never tiles two across", () => {
    expect(more).not.toContain("grid-cols-2");
    expect(choice).not.toContain("col-span-2");
    expect(choice).toMatch(/<button[\s\S]*?className="[^"]*\bw-full\b/);
    expect(more.match(/<MoreChoice/g)).toHaveLength(5);
  });

  it("a name is never cut: it takes as many lines as it needs", () => {
    expect(choice).toContain('<span className="min-w-0 flex-1 leading-tight">{label}</span>');
    expect(choice).not.toContain("truncate");
  });

  it("the rows lie in the tray the rows on You lie in, with no line down a side", () => {
    const tray = blocks.match(/const MORE_TRAY = "([^"]+)";/)![1];
    expect(read("components/you/YouRows.tsx")).toContain(`<ul className="${tray}">`);
    expect(more.match(/<ul className=\{MORE_TRAY\}>/g)).toHaveLength(2);
    expect(choice).not.toMatch(/border-(s|e|l|r|t|b)\b/);
  });

  it("on a small phone with the keyboard up, the list scrolls inside itself", () => {
    expect(more).toMatch(/^data-page-more="" className="max-h-\[45vh\] space-y-2 overflow-y-auto px-3 pt-2"/);
  });
});

describe("a quote laid from the library keeps the page's own", () => {
  const library: PageBlock = { type: "library", text: "Acquire the Spirit of peace.", cite: "St Seraphim of Sarov", href: "/saints/seraphim-of-sarov/" };
  const page: Page = {
    title: "A day in November",
    blocks: [text("What I read this morning.")],
    notebook: "Advent 2026",
    tags: ["fasting", "peace"],
    style: { font: "sans", align: "center" },
    cover: "john-chrysostom.v2.jpg",
  };

  it("its notebook, its tags, its style and its cover go back with the quote", () => {
    const kept: JournalDraft = { kind: "prayer", body: serializePage(page), editing: "abc" };
    const next = draftWithQuote(kept, library)!;
    const after = parsePage(next.body);
    expect(after.title).toBe("A day in November");
    expect(after.notebook).toBe("Advent 2026");
    expect(after.tags).toEqual(["fasting", "peace"]);
    expect(after.style).toEqual({ font: "sans", align: "center" });
    expect(after.cover).toBe("john-chrysostom.v2.jpg");
    // The quote after the words, and the draft's own kind and place kept.
    expect(after.blocks.map((b) => b.type)).toEqual(["text", "library"]);
    expect(next.kind).toBe("prayer");
    expect(next.editing).toBe("abc");
  });

  it("a page with none of them gains none, and a new page begins plain", () => {
    const plain = draftWithQuote({ kind: "reflection", body: "Only words." }, library)!;
    const after = parsePage(plain.body);
    expect([after.notebook, after.tags, after.style, after.cover]).toEqual([undefined, undefined, undefined, undefined]);
    const fresh = parsePage(draftWithQuote(null, library)!.body);
    expect(fresh.title).toBe("");
    expect(fresh.blocks.map((b) => b.type)).toEqual(["library"]);
    expect([fresh.notebook, fresh.tags, fresh.style, fresh.cover]).toEqual([undefined, undefined, undefined, undefined]);
  });
});

describe("Highlight marks words, and says so when there are none", () => {
  const coloured = (t: string, color: string): PageBlock => ({ type: "text", text: t, color });

  it("with nothing written there is nothing to mark, wherever the cursor is", () => {
    expect(highlightTarget([text("")], undefined)).toBeNull();
    // The cursor on an empty line: until 2026-11-11 that line took the colour, and nothing showed.
    expect(highlightTarget([text("")], 0)).toBeNull();
    expect(highlightTarget([quote("Acquire the Spirit of peace"), text("")], 1)).toBeNull();
    // A quote is not the writer's own words, and neither is a verse.
    expect(highlightTarget([john316, quote("Acquire the Spirit of peace", "St Seraphim"), text("  ")], 0)).toBeNull();
  });

  it("marks the paragraph the cursor is in, and with the cursor elsewhere the last one written", () => {
    const page = [text("The first."), john316, text("The second."), quote(""), text("")];
    expect(highlightTarget(page, 0)).toBe(0);
    expect(highlightTarget(page, 2)).toBe(2);
    // In Title, in a card, or on the empty line at the foot: the last paragraph with words.
    expect(highlightTarget(page, undefined)).toBe(2);
    expect(highlightTarget(page, 3)).toBe(2);
    expect(highlightTarget(page, 4)).toBe(2);
  });

  it("a line that wears a colour and has lost its words can still be chosen, so the colour can come off", () => {
    expect(highlightTarget([text("The first."), coloured("", "rose")], 1)).toBe(1);
  });

  it("the tool is never dim: it opens its colours, or one line where they would be", () => {
    const tools = code(blocks);
    expect(tools).not.toMatch(/disabled/);
    expect(tools).toMatch(/panel === "color" && target !== null \? \(\s*<div data-page-colors="" onPointerDown=\{\(e\) => e\.preventDefault\(\)\}>\s*<HighlightPicker/);
    expect(tools).toMatch(/panel === "color" && target === null \? \(\s*<p data-page-highlight-none=""[^>]*>\s*\{t\("journal\.page\.highlightNone"\)\}/);
    expect(code(hook)).toContain("highlightTarget(page.blocks, cursor?.index)");
  });

  it("a colour chosen, the cursor is still in the words: the colours hold it, as the tools do", () => {
    // A tap on a colour left the cursor nowhere (the walk: BODY after the tap, and what was typed next went nowhere).
    const tools = code(blocks);
    const colours = tools.slice(tools.indexOf('data-page-colors=""'), tools.indexOf("data-page-highlight-none"));
    expect(colours).toMatch(/^data-page-colors="" onPointerDown=\{\(e\) => e\.preventDefault\(\)\}>/);
    expect(colours).toContain("<HighlightPicker");
  });

  it("the line is the one passed for it, and every language has its own", () => {
    const words = (lang: string) => (JSON.parse(read(`lib/i18n/messages/${lang}.json`)) as Record<string, string>)["journal.page.highlightNone"];
    expect(words("en")).toBe("Highlight marks your own words. Write a few first.");
    const others = ["ar", "bg", "de", "el", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];
    for (const lang of others) {
      expect(words(lang), lang).toBeTruthy();
      expect(words(lang), lang).not.toBe(words("en"));
    }
  });
});

describe("the journal's door on You is open", () => {
  const shelf = read("components/you/KeptShelf.tsx");

  it("its cover opens the journal for every reader: no lock, and no Plus sheet in its way", () => {
    expect(shelf).toMatch(/<Tile\s+href="\/journal"\s+name=\{t\("journal\.title"\)\}/);
    expect(code(shelf)).not.toMatch(/PlusLock|useUpgradeModal|usePlusFeatures|upgrade\.open/);
    expect(code(shelf)).not.toContain("onClick");
    expect(shelf).toContain("count={journal.length}");
  });

  it("and that is what the app tells every reader: writing in the journal stays free", () => {
    const en = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;
    expect(en["plus.journal.keep"]).toBe("Writing in your journal, and your notes on verses, stay free, whether or not you subscribe.");
    expect(read("docs/1.9-build/free-and-plus.md")).toContain("writing in your journal, on this device (plus.journal.keep");
  });
});
