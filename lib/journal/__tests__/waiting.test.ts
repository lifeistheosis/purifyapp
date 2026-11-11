// What waits is never lost (1.9, the journal's fact 17, 2026-11-11).
//
// What a reader met: half a thought written, the sheet closed ("Continue
// writing"), an older entry tapped, and the half thought was gone. The page
// opened took the waiting one's place in the journal's one draft. The same
// happened from a reading's pen, a plan's question, a quote laid while a
// verse's note waited, and a page begun from a gathering.
//
// The rule (approved the same day): before the journal opens anything else,
// what waits is kept exactly as Done keeps it, and opening the same page goes
// on with it. An empty page makes nothing. A kept page opened and left
// unchanged makes no second copy and takes no new date.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readVerseAnnotation, verseAnnotationKey } from "@/lib/bible/annotations";

import { JOURNAL_KEY, readDraft, readRecords, writeDraft, type JournalDraft, type JournalRecord } from "../entries";
import { askJournalPage, JOURNAL_PAGE_KEY, renameGatheringPages, takeJournalPage, writeInGathering } from "../gatheringActions";
import { draftWaits, keepDone, keepWaiting, openKeeping } from "../keepDraft";
import { parsePage, verseBlock } from "../page";
import { JOURNAL_OPEN_KEY, quoteInJournal } from "../quoteInJournal";
import { draftIsEmpty, keeping, noteVerse, openOver, samePage, waits, type Kept } from "../waiting";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const X = "11111111-1111-4111-8111-111111111111";
const Y = "22222222-2222-4222-8222-222222222222";
const AT = "2026-11-01T08:00:00.000Z";
const record = (id: string, body: string, more: Partial<JournalRecord> = {}): JournalRecord => ({ id, kind: "reflection", body, createdAt: AT, updatedAt: AT, ...more });
const older = record(X, "# An older page\n\nWords kept last week.");
const other = record(Y, "Another page.", { kind: "prayer" });
const asOpened = (r: JournalRecord): JournalDraft => ({ kind: r.kind, body: r.body, prompt: r.prompt, source: r.source, editing: r.id });
const HALF: JournalDraft = { kind: "reflection", body: "Half a thought I mean to finish." };

const kept = (records: JournalRecord[], notes: Record<string, string> = {}): Kept => ({
  record: (id) => records.find((r) => r.id === id),
  note: (book, chapter, verse) => notes[`${book}:${chapter}:${verse}`],
});

describe("Done's rules, in one place", () => {
  const all = kept([older, other], { "john:3:16": "My note on the verse." });

  it("a new page with something on it becomes an entry, as it was written", () => {
    const source = { type: "chapter" as const, book: "john", chapter: 3, label: "John 3" };
    expect(keeping({ kind: "prayer", body: "  Lord, have mercy.\n", source }, all)).toEqual({ do: "add", kind: "prayer", body: "Lord, have mercy.", prompt: undefined, source });
  });

  it("an empty page makes nothing: no words, or only its notebook, its tags or its look", () => {
    for (const body of ["", "  \n ", "[[notebook Advent 2026]]", "[[notebook Advent 2026]]\n[[tags fasting]]\n[[style font=sans]]"]) {
      expect(draftIsEmpty({ kind: "reflection", body }), body).toBe(true);
      expect(keeping({ kind: "reflection", body }, all), body).toEqual({ do: "nothing" });
    }
    // A verse card alone is something: the reader chose it.
    expect(draftIsEmpty({ kind: "reflection", body: "[[verse john 3:16]]" })).toBe(false);
  });

  it("a kept entry that was changed is changed, and keeps its id", () => {
    expect(keeping({ ...asOpened(older), body: `${older.body}\n\nAnd a line more.` }, all)).toMatchObject({ do: "update", id: X, body: `${older.body}\n\nAnd a line more.` });
    // Its kind alone is a change too.
    expect(keeping({ ...asOpened(older), kind: "prayer" }, all)).toMatchObject({ do: "update", id: X, kind: "prayer" });
  });

  it("a kept entry opened and left as it was is not written again: no second copy, no new date", () => {
    expect(keeping(asOpened(older), all)).toEqual({ do: "nothing" });
    // The same page however it was written down: the editor's own spacing is no change.
    expect(keeping({ ...asOpened(older), body: "# An older page\r\n\r\nWords kept last week.  \n\n" }, all)).toEqual({ do: "nothing" });
  });

  it("a kept entry emptied is taken away by Done; one already gone, or never there, is left alone", () => {
    expect(keeping({ ...asOpened(older), body: "" }, all)).toEqual({ do: "remove", id: X });
    expect(keeping({ ...asOpened(older), body: "[[notebook Advent 2026]]" }, all)).toEqual({ do: "remove", id: X });
    const gone = kept([{ ...older, deletedAt: AT }]);
    expect(keeping({ ...asOpened(older), body: "" }, gone)).toEqual({ do: "nothing" });
    expect(keeping({ ...asOpened(older), body: "" }, kept([]))).toEqual({ do: "nothing" });
  });

  // Before 2026-11-11 the words were put on the removed entry, where no one saw them again.
  it("changes to an entry taken away since (on another device, say) are kept as a page of their own; unchanged, it is not brought back", () => {
    const gone = kept([{ ...older, deletedAt: AT }]);
    const changed = { ...asOpened(older), body: `${older.body}\n\nA line I had begun.` };
    expect(keeping(changed, gone)).toEqual({ do: "add", kind: "reflection", body: changed.body, prompt: undefined, source: undefined });
    expect(keeping(asOpened(older), gone)).toEqual({ do: "nothing" });
    // An entry no longer in the list at all: its words are kept the same way.
    expect(keeping(changed, kept([]))).toMatchObject({ do: "add", body: changed.body });
    expect(waits(changed, gone)).toBe(true);
    expect(waits(asOpened(older), gone)).toBe(false);
  });

  it("a verse's note goes back on its verse; unchanged it is not written again; with no words it comes off", () => {
    const note = (body: string): JournalDraft => ({ kind: "reflection", body, editing: "note:john:3:16" });
    expect(keeping(note("My note, with more."), all)).toEqual({ do: "note", book: "john", chapter: 3, verse: 16, note: "My note, with more." });
    expect(keeping(note("My note on the verse. "), all)).toEqual({ do: "nothing" });
    expect(keeping(note(""), all)).toEqual({ do: "note", book: "john", chapter: 3, verse: 16, note: "" });
    // No note there and none written: nothing.
    expect(keeping({ kind: "reflection", body: "", editing: "note:john:1:1" }, all)).toEqual({ do: "nothing" });
    // A note's name that names no verse is never taken for an entry.
    expect(noteVerse("note:john")).toBeNull();
    expect(keeping({ kind: "reflection", body: "Words.", editing: "note:john" }, all)).toEqual({ do: "nothing" });
  });
});

describe("what waits when the sheet is closed", () => {
  const all = kept([older, other], { "john:3:16": "My note on the verse." });

  it("a new page with something on it, and a kept one with changes", () => {
    expect(waits(HALF, all)).toBe(true);
    expect(waits({ ...asOpened(older), body: `${older.body}\n\nA line I had begun.` }, all)).toBe(true);
    expect(waits({ kind: "reflection", body: "My note, with more.", editing: "note:john:3:16" }, all)).toBe(true);
  });

  it("FACT 18: a kept entry or a note opened to be read and left as it was does not wait, so Write begins a new page", () => {
    expect(waits(asOpened(older), all)).toBe(false);
    expect(waits({ kind: "reflection", body: "My note on the verse.", editing: "note:john:3:16" }, all)).toBe(false);
  });

  it("an empty page does not wait", () => {
    expect(waits({ kind: "reflection", body: "[[notebook Advent 2026]]" }, all)).toBe(false);
    expect(waits({ ...asOpened(older), body: "" }, all)).toBe(false);
  });
});

describe("the same page", () => {
  it("a kept entry or a verse's note is itself; a new page is the one begun from the same place", () => {
    expect(samePage(asOpened(older), { ...asOpened(older), body: "changed" })).toBe(true);
    expect(samePage(asOpened(older), asOpened(other))).toBe(false);
    expect(samePage(asOpened(older), HALF)).toBe(false);
    // Write, with a plain page waiting.
    expect(samePage(HALF, { kind: "reflection", body: "" })).toBe(true);
    // A reading's pen, whatever the reading is called in the reader's language today.
    const gospel = (label: string) => ({ type: "reading" as const, kind: "gospel" as const, book: "john", chapter: 1, from: 1, to: 17, label });
    expect(samePage({ kind: "prayer", body: "Half.", source: gospel("Gospel · John 1:1-17") }, { kind: "reflection", body: "", source: gospel("Evangelium · Johannes 1:1-17") })).toBe(true);
    expect(samePage({ kind: "reflection", body: "Half.", source: gospel("") }, { kind: "reflection", body: "" })).toBe(false);
    // A plan's question, by its key.
    const q = (key: string, text: string) => ({ kind: "question" as const, body: "", prompt: { key, text } });
    expect(samePage(q("d1.q1", "What stays with you?"), q("d1.q1", "Was bleibt bei dir?"))).toBe(true);
    expect(samePage(q("d1.q1", "What stays with you?"), q("d1.q2", "What stays with you?"))).toBe(false);
  });
});

describe("the journal is asked to open a page while another waits", () => {
  const all = kept([older, other], { "john:3:16": "My note on the verse." });

  it("FACT 17: half a thought waits and an older entry is opened: the half thought is kept as an entry first", () => {
    const step = openOver(HALF, asOpened(older), all);
    expect(step.keep).toEqual({ do: "add", kind: "reflection", body: "Half a thought I mean to finish.", prompt: undefined, source: undefined });
    expect(step.open).toEqual(asOpened(older));
  });

  it("the same from a reading's pen, a plan's question and a verse's note", () => {
    const pen: JournalDraft = { kind: "reflection", body: "", source: { type: "reading", kind: "gospel", book: "john", chapter: 1, from: 1, to: 17, label: "" } };
    const question: JournalDraft = { kind: "question", body: "", prompt: { key: "d1.q1", text: "What stays with you?" } };
    const note: JournalDraft = { kind: "reflection", body: "My note on the verse.", editing: "note:john:3:16" };
    for (const next of [pen, question, note]) {
      const step = openOver(HALF, next, all);
      expect(step.keep.do).toBe("add");
      expect(step.open).toBe(next);
    }
  });

  it("opening the same page goes on with what waits, and nothing is kept yet", () => {
    const changed = { ...asOpened(older), body: `${older.body}\n\nA line I had begun.` };
    expect(openOver(changed, asOpened(older), all)).toEqual({ keep: { do: "nothing" }, open: changed });
    // Write, with a plain page waiting.
    expect(openOver(HALF, { kind: "reflection", body: "" }, all)).toEqual({ keep: { do: "nothing" }, open: HALF });
  });

  it("EDGE: an empty page that waits makes nothing, and never takes an entry away", () => {
    const next = asOpened(other);
    expect(openOver({ kind: "reflection", body: "[[notebook Advent 2026]]" }, next, all)).toEqual({ keep: { do: "nothing" }, open: next });
    // An entry whose words were cleared, and the sheet left without Done: the entry stays as it was kept.
    expect(openOver({ ...asOpened(older), body: "" }, next, all)).toEqual({ keep: { do: "nothing" }, open: next });
    // And asked for again, it opens as it is kept, not as the empty page that waited.
    expect(openOver({ ...asOpened(older), body: "" }, asOpened(older), all).open).toEqual(asOpened(older));
  });

  it("EDGE: a kept page opened and left unchanged makes no second copy and takes no new date", () => {
    expect(openOver(asOpened(older), asOpened(other), all)).toEqual({ keep: { do: "nothing" }, open: asOpened(other) });
  });

  it("a kept page that waits with changes is changed, not copied", () => {
    const changed = { ...asOpened(older), body: `${older.body}\n\nA line I had begun.` };
    expect(openOver(changed, asOpened(other), all).keep).toMatchObject({ do: "update", id: X });
  });

  it("a verse's note that waits with changes goes back on its verse", () => {
    const note: JournalDraft = { kind: "reflection", body: "My note, with more.", editing: "note:john:3:16" };
    expect(openOver(note, asOpened(other), all).keep).toEqual({ do: "note", book: "john", chapter: 3, verse: 16, note: "My note, with more." });
  });

  it("nothing waits: the page asked for opens", () => {
    expect(openOver(null, asOpened(older), all)).toEqual({ keep: { do: "nothing" }, open: asOpened(older) });
  });
});

// ── On a device ─────────────────────────────────────────────────────────

function device(records: JournalRecord[] = [older, other]) {
  const store = (): Storage => {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
  };
  const w = { localStorage: store(), sessionStorage: store(), dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as { window?: unknown }).window = w;
  w.localStorage.setItem(JOURNAL_KEY, JSON.stringify(records));
  return w;
}

describe("on a device: what waits is kept as Done keeps it", () => {
  beforeEach(() => {
    // A new page is counted once (lib/analytics/featureCount.ts): nothing is sent from a test.
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(null)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as { window?: unknown }).window;
  });

  it("FACT 17: the half thought is in the list as a page, the entries around it are untouched, and the entry asked for opens", () => {
    device();
    writeDraft(HALF);
    const open = openKeeping(asOpened(older));
    expect(open).toEqual(asOpened(older));
    const list = readRecords();
    expect(list).toHaveLength(3);
    expect(list[0]).toMatchObject({ kind: "reflection", body: "Half a thought I mean to finish." });
    expect(list.slice(1)).toEqual([older, other]);
  });

  it("EDGE: an unchanged kept page that waits leaves the list exactly as it was", () => {
    const w = device();
    const before = w.localStorage.getItem(JOURNAL_KEY);
    writeDraft(asOpened(older));
    expect(openKeeping(asOpened(other))).toEqual(asOpened(other));
    expect(w.localStorage.getItem(JOURNAL_KEY)).toBe(before);
  });

  it("EDGE: an empty page that waits makes nothing", () => {
    const w = device();
    const before = w.localStorage.getItem(JOURNAL_KEY);
    writeDraft({ kind: "reflection", body: "[[notebook Advent 2026]]" });
    openKeeping(asOpened(other));
    expect(w.localStorage.getItem(JOURNAL_KEY)).toBe(before);
    expect(keepWaiting({ ...asOpened(older), body: "" })).toEqual({ do: "nothing" });
    expect(readRecords().find((r) => r.id === X)?.deletedAt).toBeUndefined();
  });

  it("a kept page that waits with changes is changed in place: one copy, its first date kept, its change dated", () => {
    device();
    writeDraft({ ...asOpened(older), body: `${older.body}\n\nA line I had begun.` });
    openKeeping(asOpened(other));
    const list = readRecords();
    expect(list).toHaveLength(2);
    const x = list.find((r) => r.id === X)!;
    expect(x.body).toBe(`${older.body}\n\nA line I had begun.`);
    expect(x.createdAt).toBe(AT);
    expect(Date.parse(x.updatedAt)).toBeGreaterThan(Date.parse(AT));
    expect(list.find((r) => r.id === Y)).toEqual(other);
  });

  it("opening the same page goes on with what waits, and the list is as it was", () => {
    const w = device();
    const before = w.localStorage.getItem(JOURNAL_KEY);
    const changed = { ...asOpened(older), body: `${older.body}\n\nA line I had begun.` };
    writeDraft(changed);
    expect(openKeeping(asOpened(older))).toEqual(changed);
    expect(w.localStorage.getItem(JOURNAL_KEY)).toBe(before);
  });

  it("FACT 18: on a device, an entry opened and left as it was does not wait; changed, it does", () => {
    device();
    expect(draftWaits(asOpened(older))).toBe(false);
    expect(draftWaits({ ...asOpened(older), body: `${older.body}\n\nA line I had begun.` })).toBe(true);
    expect(draftWaits(HALF)).toBe(true);
  });

  it("Done keeps as it always has: a new page added, an emptied entry taken away", () => {
    device();
    expect(keepDone({ kind: "prayer", body: "Lord, have mercy." }).do).toBe("add");
    expect(readRecords()[0]).toMatchObject({ kind: "prayer", body: "Lord, have mercy." });
    expect(keepDone({ ...asOpened(older), body: "" })).toEqual({ do: "remove", id: X });
    expect(readRecords().find((r) => r.id === X)?.deletedAt).toBeTruthy();
  });

  it("a quote laid while a verse's note waits: the note goes back on its verse, and the quote begins a page of its own", () => {
    const w = device();
    w.localStorage.setItem(verseAnnotationKey("john", 3, 16), JSON.stringify({ note: "My note on the verse.", noteAt: AT, at: AT }));
    writeDraft({ kind: "reflection", body: "My note, with more.", editing: "note:john:3:16" });
    expect(quoteInJournal(verseBlock("john", 4, 14)!)).toBe(true);
    expect(readVerseAnnotation("john", 3, 16).note).toBe("My note, with more.");
    const draft = readDraft()!;
    expect(draft.editing).toBeUndefined();
    expect(parsePage(draft.body).blocks[0]).toEqual(verseBlock("john", 4, 14));
    // A quote laid on the page being written keeps nothing: it is the same page.
    const before = w.localStorage.getItem(JOURNAL_KEY);
    expect(quoteInJournal(verseBlock("john", 4, 15)!)).toBe(true);
    expect(w.localStorage.getItem(JOURNAL_KEY)).toBe(before);
  });

  it("a page begun from a gathering while another waits: the one that waited is kept, and the new page is in the gathering", () => {
    const w = device();
    writeDraft(HALF);
    expect(writeInGathering("Advent 2026", null)).toBe(true);
    expect(readRecords()).toHaveLength(3);
    expect(readRecords()[0].body).toBe("Half a thought I mean to finish.");
    const draft = readDraft()!;
    expect(parsePage(draft.body).notebook).toBe("Advent 2026");
    expect(draft.body).not.toContain("Half a thought");
    expect(w.sessionStorage.getItem(JOURNAL_OPEN_KEY)).toBe("1");
  });

  it("the page being written in a gathering goes on there, and nothing is kept yet", () => {
    const w = device();
    const before = w.localStorage.getItem(JOURNAL_KEY);
    writeDraft({ kind: "reflection", body: "[[notebook Advent 2026]]\n\nBegun here." });
    expect(writeInGathering("Advent 2026", verseBlock("john", 1, 1))).toBe(true);
    expect(w.localStorage.getItem(JOURNAL_KEY)).toBe(before);
    const page = parsePage(readDraft()!.body);
    expect(page.blocks.map((b) => b.type)).toEqual(["text", "verse"]);
    expect(page.notebook).toBe("Advent 2026");
  });

  it("a page too long to take the card changes nothing at all", () => {
    const w = device();
    const full: JournalDraft = { kind: "reflection", body: `[[notebook Advent 2026]]\n\n${"x".repeat(19_990)}` };
    writeDraft(full);
    const before = w.localStorage.getItem(JOURNAL_KEY);
    expect(writeInGathering("Advent 2026", verseBlock("john", 1, 1))).toBe(false);
    expect(readDraft()).toEqual(full);
    expect(w.localStorage.getItem(JOURNAL_KEY)).toBe(before);
    expect(w.sessionStorage.getItem(JOURNAL_OPEN_KEY)).toBeNull();
  });

  it("a gathering asks the journal for one of its pages, once", () => {
    const w = device();
    askJournalPage(X);
    expect(w.sessionStorage.getItem(JOURNAL_PAGE_KEY)).toBe(X);
    expect(takeJournalPage()).toBe(X);
    expect(takeJournalPage()).toBeNull();
  });

  it("a gathering renamed: its pages bear the new name, dated now, and no other page is touched", () => {
    device([record(X, "[[notebook Advent 2026]]\n\nIn the gathering."), other]);
    expect(renameGatheringPages("advent 2026", "The Nativity Fast")).toBe(1);
    const list = readRecords();
    expect(parsePage(list[0].body).notebook).toBe("The Nativity Fast");
    expect(Date.parse(list[0].updatedAt)).toBeGreaterThan(Date.parse(AT));
    expect(list[0].createdAt).toBe(AT);
    expect(list[1]).toEqual(other);
    expect(renameGatheringPages("Advent 2026", "Something else")).toBe(0);
  });
});

describe("the journal's own screen goes through the rule", () => {
  const client = read("components/journal/JournalClient.tsx");

  it("whatever it opens, what waits is kept first: the page opened no longer takes the draft's place unasked", () => {
    const begin = client.slice(client.indexOf("const begin = useCallback"), client.indexOf("const write = () =>"));
    expect(begin).toContain("const page = openKeeping(next);");
    expect(begin).toContain("writeDraft(page);");
    expect(begin).not.toContain("writeDraft(next)");
    // Every way to open a page is begin's: an entry, a note, a question, a reading's pen, the empty journal's prompt.
    expect(client.match(/\bbegin\(/g)!.length).toBeGreaterThanOrEqual(6);
    expect(client).not.toMatch(/setDraft\((?!page\)|next\))/);
  });

  it("Done keeps by the same rules, and an empty page does not wait", () => {
    const done = client.slice(client.indexOf("const done = () =>"), client.indexOf("// ── Taking away"));
    expect(done).toContain("keepDone(draft);");
    expect(done).not.toMatch(/addRecord|updateRecord/);
    const close = client.slice(client.indexOf("const close = () =>"), client.indexOf("const done = () =>"));
    expect(close).toContain("const keep = draftWaits(draft);");
    expect(close).not.toContain("draft.body.trim().length > 0");
    expect(client).toContain("setWaitingDraft(!!kept && draftWaits(kept));");
    // Write goes on only with what waits (or a question not yet answered): never with an old entry that was only read.
    expect(client).toContain("begin(kept && (draftWaits(kept) || (!kept.editing && kept.prompt)) ? kept : BLANK);");
  });

  it("a page taken away takes its waiting changes with it, so Undo brings them back and nothing waits on a page that is gone", () => {
    const remove = client.slice(client.indexOf("const remove = (item: JournalItem) =>"), client.indexOf("const dayOf"));
    expect(remove).toMatch(/if \(waiting\?\.editing && waiting\.editing === itemKey\) \{\s*keepWaiting\(waiting\);\s*clearDraft\(\);\s*setWaitingDraft\(false\);/);
    expect(remove.indexOf("keepWaiting(waiting)")).toBeLessThan(remove.indexOf("removeRecord(id)"));
  });

  it("a gathering's ask for one of its pages opens that page, through the same rule", () => {
    expect(client).toMatch(/const id = takeJournalPage\(\);\s*const asked = id \? readRecords\(\)\.find\(\(r\) => r\.id === id && !r\.deletedAt\) : undefined;[\s\S]*?if \(asked\) openRecord\(asked\);/);
    expect(client).toContain("const openRecord = useCallback((r: JournalRecord) => begin(");
  });
});
