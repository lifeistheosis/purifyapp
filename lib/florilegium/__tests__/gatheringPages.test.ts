// The Florilegium and the journal's notebooks as one (1.9, build 93 note 19,
// the owner on 2026-11-11: "I want the Florigelium and the notebook system
// like intertwined").
//
// Before, they met nowhere. Now a gathering's page shows the journal's pages
// written in it and begins one; a gathered line begins a page with itself as
// the card; a page's notebook choice offers the gatherings first; and the
// journal's list knows a gathering's notebook and leads to it. The rules are
// lib/journal/gatherings.ts (lib/journal/__tests__/gatherings.test.ts); this
// holds the screens to them.
//
// What a reader would notice if this broke: a gathering with no sign of what
// they wrote about it; a way to write offered to a reader whose Plus has
// lapsed; "Write a page" cut to a letter on a narrow phone; or a gathering
// renamed and its pages left behind under the old name.

import fs from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { JOURNAL_KEY, readRecords, type JournalRecord } from "@/lib/journal/entries";
import { parsePage } from "@/lib/journal/page";

import { listFlorilegia, renameFlorilegium, type Florilegium } from "../florilegium";

const read = (rel: string) => fs.readFileSync(rel, "utf8");
const pages = read("components/florilegium/GatheringPages.tsx");
const detail = read("components/florilegium/FlorilegiumDetail.tsx");
const feed = read("components/journal/JournalFeed.tsx");
const client = read("components/journal/JournalClient.tsx");
const blocks = read("components/journal/PageBlocks.tsx");
const store = read("lib/florilegium/florilegium.ts");

describe("a gathering's page shows its journal pages, and begins one", () => {
  it("under its lines and over what is done with the whole of it, and not in the booklet", () => {
    const at = detail.indexOf("<GatheringPages title={f.title} readOnly={readOnly} />");
    expect(at).toBeGreaterThan(detail.indexOf("data-gathering-lines"));
    expect(at).toBeLessThan(detail.indexOf('data-gathering-tools=""'));
    // After the part the booklet prints has closed.
    expect(at).toBeGreaterThan(detail.indexOf("</ul>\n        )}\n      </div>"));
    expect(pages).toContain('data-gathering-pages="" data-print-hide=""');
  });

  it("drawn as the Florilegium's first page draws the reader's gatherings: a part's name, one tray, a row for each", () => {
    for (const part of ["FLOR_H2", "FLOR_TRAY", "FLOR_ROW", "FLOR_PLATE", "FLOR_FACT"]) expect(pages, part).toContain(`{${part}}`.replace("{FLOR_TRAY}", "FLOR_TRAY"));
    expect(pages).toContain('<li key={p.id} className="theology-rule">');
    expect(pages).toContain("const pages = useMemo(() => pagesIn(title, records, verseLabel), [title, records, verseLabel]);");
    // The journal's own icon for a page, and the house's for a new one.
    expect(pages).toContain("<Pen size={18} />");
    expect(pages).toContain("<Plus size={18} />");
  });

  it("a row opens that page in the journal, and the last row begins one here", () => {
    expect(pages).toMatch(/data-gathering-page-row=\{p\.id\}\s*onClick=\{\(\) => \{\s*askJournalPage\(p\.id\);\s*router\.push\("\/journal\/"\);/);
    expect(pages).toMatch(/data-gathering-write=""\s*onClick=\{\(\) => \{\s*if \(writeInGathering\(title, null\)\) router\.push\("\/journal\/"\);/);
    expect(pages).toContain('t("study.florilegium.writeHere")');
  });

  it("a reader whose Plus has lapsed opens the pages they wrote and is offered no way to write; with no pages there is nothing", () => {
    expect(pages).toContain("if (readOnly && pages.length === 0) return null;");
    const write = pages.slice(pages.indexOf("{readOnly ? null : ("), pages.indexOf("</ul>"));
    expect(write).toContain('data-gathering-write=""');
    expect(pages.slice(0, pages.indexOf("{readOnly ? null : (")).includes("writeInGathering(title")).toBe(false);
  });

  it("a page's own title is the reader's words: read their own way, and cut to a line only by name", () => {
    expect(pages).toMatch(/dir="auto"\s*data-mock-allow="cut"\s*data-mock-why="[^"]+"/);
  });
});

describe("a gathered line begins a page", () => {
  const card = detail.slice(detail.indexOf("export function ItemCard"));

  it("Write a page, after the note's button and before Remove, absent for a lapsed reader and in the Plus page's preview", () => {
    const tools = card.slice(card.indexOf("{!editing && !readOnly && ("), card.indexOf("{editing ? ("));
    const note = tools.indexOf('t("bible.addNote")');
    const write = tools.indexOf('t("study.florilegium.writePage")');
    const remove = tools.indexOf('t("prayers.diptychs.remove")');
    expect(note).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(note);
    expect(remove).toBeGreaterThan(write);
    expect(tools).toContain("{onWrite ? (");
    expect(tools).toContain('data-gathered-write=""');
    // Outside that part there is no way to begin one.
    expect(card.replace(tools, "")).not.toContain("study.florilegium.writePage");
  });

  it("the page it begins is in this gathering, with the line as its card", () => {
    expect(detail).toContain("if (writeInGathering(f.title, lineBlock(item))) router.push(\"/journal/\");");
  });

  it("three things to do fit a narrow phone: they wrap before any name is cut, and each is 44px to the finger", () => {
    expect(card).toContain('<span className="ms-auto flex max-w-full flex-wrap items-center justify-end" data-gathered-tools="" data-print-hide="">');
    expect(card).not.toContain('"ms-auto flex shrink-0 items-center"');
    const quiet = read("components/florilegium/florStyle.ts");
    expect(quiet.slice(quiet.indexOf("export const FLOR_QUIET"))).toContain("min-h-11");
    expect(quiet.slice(quiet.indexOf("export const FLOR_QUIET"), quiet.indexOf("export const FLOR_FIELD"))).not.toMatch(/truncate|overflow-hidden/);
  });
});

describe("the journal knows a gathering's notebook", () => {
  it("a page's notebook choice offers the reader's gatherings first, each with the flower", () => {
    const panel = blocks.slice(blocks.indexOf("function PropsPanel"), blocks.indexOf("function CoverRow"));
    expect(panel).toContain("const { florilegia } = useFlorilegia();");
    expect(panel).toMatch(/notebookChoices\(\s*florilegia\.map\(\(f\) => f\.title\),\s*notebooks,\s*current,\s*\)/);
    expect(panel).toContain('{n.gathering ? <Flower size={14} className="shrink-0" /> : <ClosedBook size={14} className="shrink-0" />}');
    expect(panel).toContain("onClick={() => editor.setNotebook(n.name)}");
    expect(panel).toMatch(/h-11/);
  });

  it("in the list, its chip wears the flower, and while its pages are shown a line says how many lines it keeps and opens it", () => {
    expect(feed).toContain('{gatheringOf(n, gatherings) ? <Flower size={14} className="shrink-0" /> : <ClosedBook size={14} className="shrink-0" />}');
    expect(feed).toContain('data-journal-notebook={gatheringOf(n, gatherings) ? "gathering" : "notebook"}');
    expect(feed).toContain("const gathering = gatheringOf(notebook, gatherings);");
    const line = feed.slice(feed.indexOf("{gathering ? ("), feed.indexOf("{items.length > SEARCH_ABOVE ? ("));
    expect(line).toContain("href={gatheringHref(gathering.id)}");
    expect(line).toContain('tn("study.florilegium.lineCount", gathering.lines)');
    expect(line).toMatch(/min-h-11/);
    // A way to a place: it points on, with the icon, on the reading side in every language.
    expect(line).toContain('<ChevronRight size={14} aria-hidden className="ms-auto shrink-0 rtl:-scale-x-100" />');
    expect(line).not.toMatch(/→|›/);
    // Existing words only: nothing is said here that the app did not already say.
    expect(line.match(/\bt\(|tn\(/g)).toEqual(["tn("]);
  });

  // Found drawing a gathering's chip: with enough chips to scroll, "The Prologue of John" stood on three lines in its pill.
  it("a notebook's chip keeps its name on one line: it is not squeezed when the row scrolls, and a long name is cut by name", () => {
    const chip = feed.slice(feed.indexOf("{notebooks.map((n) => ("), feed.indexOf("</ChipScroller>"));
    expect(chip).toContain('className="inline-flex max-w-[15rem] items-center gap-1.5 whitespace-nowrap"');
    expect(chip).toMatch(/<span dir="auto" data-mock-allow="cut" data-mock-why="[^"]+" className="min-w-0 truncate">\s*\{n\}\s*<\/span>/);
  });

  it("the journal hands it the reader's gatherings, and a computer's side column wears the flower too", () => {
    expect(client).toContain("const gatherings = useMemo(() => florilegia.map((f) => ({ id: f.id, name: f.title, lines: f.items.length })), [florilegia]);");
    expect(client).toContain("gatherings={gatherings}");
    expect(client.slice(client.indexOf("function NotebookRail"))).toContain("{gatheringOf(n, gatherings) ? <Flower size={16} className=\"shrink-0\" /> : <ClosedBook size={16} className=\"shrink-0\" />}");
  });
});

// ── On a device ─────────────────────────────────────────────────────────

const AT = "2026-11-01T08:00:00.000Z";
const record = (id: string, body: string): JournalRecord => ({ id, kind: "reflection", body, createdAt: AT, updatedAt: AT });
const gathering = (id: string, title: string): Florilegium => ({ id, title, createdAt: 1, updatedAt: 1, items: [] });

function device(gatherings: Florilegium[], records: JournalRecord[]) {
  const m = new Map<string, string>();
  const storage: Storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
  (globalThis as { window?: unknown }).window = { localStorage: storage, sessionStorage: storage, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  storage.setItem("purify:florilegia", JSON.stringify(gatherings));
  storage.setItem(JOURNAL_KEY, JSON.stringify(records));
}

describe("a gathering renamed, or taken away", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  const inIt = record("a", "# One\n\n[[notebook Advent 2026]]\n\nWritten in the gathering.");
  const elsewhere = record("b", "[[notebook Lent 2027]]\n\nWritten elsewhere.");

  it("renamed, it takes its pages with it, and no other page is touched", () => {
    device([gathering("g1", "Advent 2026")], [inIt, elsewhere]);
    renameFlorilegium("g1", "The Nativity Fast");
    expect(listFlorilegia()[0].title).toBe("The Nativity Fast");
    const [a, b] = readRecords();
    expect(parsePage(a.body).notebook).toBe("The Nativity Fast");
    expect(parsePage(a.body).title).toBe("One");
    expect(Date.parse(a.updatedAt)).toBeGreaterThan(Date.parse(AT));
    expect(b).toEqual(elsewhere);
  });

  it("while another gathering still bears the old name, the pages stay: they are that gathering's too", () => {
    device([gathering("g1", "Advent 2026"), gathering("g2", "advent 2026")], [inIt]);
    renameFlorilegium("g1", "The Nativity Fast");
    expect(readRecords()).toEqual([inIt]);
  });

  it("said again with the same name, or with none, nothing of the journal changes", () => {
    device([gathering("g1", "Advent 2026")], [inIt]);
    renameFlorilegium("g1", "Advent 2026", "What I keep for the fast");
    renameFlorilegium("g1", "   ");
    renameFlorilegium("no-such-gathering", "Anything");
    expect(listFlorilegia()[0]).toMatchObject({ title: "Advent 2026" });
    expect(readRecords()).toEqual([inIt]);
  });

  it("the hook's rename is this rule, and taking a gathering away leaves the journal alone: its pages stay, in a notebook of that name", () => {
    expect(store).toContain("const rename = useCallback((id: string, title: string, description?: string) => renameFlorilegium(id, title, description), []);");
    const remove = store.slice(store.indexOf("const remove = useCallback"), store.indexOf("const addItem = useCallback"));
    expect(remove).toContain("writeAll(readAll().filter((f) => f.id !== id));");
    expect(remove).not.toMatch(/Records|journal|renameGatheringPages/i);
  });
});
