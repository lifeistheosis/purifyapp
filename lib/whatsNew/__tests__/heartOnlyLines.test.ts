// The words readers are given say what Heart does, and nothing of the voices
// that are gone (his word of 2026-11-16, about 22:35 UTC: "remove locally LLM
// voices and full drop ... (only leave one the standard prerecorded voices)").
// The pre-build gate's part 4: no line promises what is not true.
//
// What it holds:
//   the 1.9 note      (docs/plans/v1.9/patch-note-1.9.json, and the two copies
//                     the apps carry, data/changelog/entries.json and
//                     patches.json) names no phone's voice, no choice of
//                     voices and no voice in Purify Plus; and while Heart has
//                     recorded no text beside the Bible (data/listen/index.json
//                     empty), it says no text beside the Bible is read aloud
//   the drop          (docs/plans/v1.9/drop.json) names Emma, Michael and
//                     Fenrir only to say they are dropped, and no piece it
//                     sends says a text beside the Bible is read aloud while
//                     none is
//   the FAQ           says every chapter of the Bible is read aloud only once
//                     Heart has read every one: today the New Testament
//
// What a reader would notice if this broke: a note that promises the saints'
// lives read aloud with no Listen on any life, or a voice of their choosing
// that the app does not have.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import books from "@/data/bible/books.json";
import entries from "@/data/changelog/entries.json";
import patches from "@/data/changelog/patches.json";
import carriedTexts from "@/data/listen/index.json";
import carriedChapters from "@/data/readAloud/index.json";

const ROOT = process.cwd();
const json = <T>(rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;

/** The voices that are gone, as a line would name them. */
const GONE = [/phone'?s? (?:own )?voices?/i, /\bchoose (?:a|your) voice\b/i, /\bvoice sheet\b/i, /\bvoices? in purify plus\b/i, /\bplus voices?\b/i, /\bfenrir\b/i, /\bemma\b/i];
/** A line that says a text beside the Bible is read aloud. */
const TEXTS_ALOUD = /every text read aloud|(?:lives|councils|theology|history|works)[^.]{0,80}read aloud/i;

const noTextRecorded = (carriedTexts as string[]).length === 0;

type NoteFile = { version: string; items: { text: string }[] };
const note = json<NoteFile>("docs/plans/v1.9/patch-note-1.9.json");
const entry = (entries as unknown as { version: string; items?: { text: string }[] }[]).find((e) => e.version === "1.9");
const patch = (patches as unknown as { version: string; intro?: string; sections?: { heading: string; body: string }[] }[]).find((e) => e.version === "1.9");

describe("the 1.9 note, and the copies the apps carry", () => {
  const lines: [string, string][] = [
    ...note.items.map((i, n) => [`patch-note-1.9.json item ${n}`, i.text] as [string, string]),
    ...(entry?.items ?? []).map((i, n) => [`entries.json 1.9 item ${n}`, i.text] as [string, string]),
    ...(patch?.sections ?? []).map((s) => [`patches.json 1.9 "${s.heading}"`, s.body] as [string, string]),
    ["patches.json 1.9 intro", patch?.intro ?? ""],
  ];

  it("is found in all three places", () => {
    expect(note.version).toBe("1.9");
    expect(entry).toBeTruthy();
    expect(patch).toBeTruthy();
  });

  it("names no phone's voice, no choice of voices and no voice in Purify Plus", () => {
    const said = lines.flatMap(([where, text]) => GONE.filter((re) => re.test(text)).map((re) => `${where}: ${re.source}`));
    expect(said).toEqual([]);
  });

  it.runIf(noTextRecorded)("says no text beside the Bible is read aloud while Heart has recorded none", () => {
    expect(lines.filter(([, text]) => TEXTS_ALOUD.test(text)).map(([where]) => where)).toEqual([]);
  });

  it("keeps its listening line, word for word, in the copy the apps carry", () => {
    const listening = note.items.find((i) => i.text.startsWith("Listening:"));
    expect(listening?.text).toBe("Listening: one card at rest and a small pill as you scroll, and your place kept in every book.");
    expect(entry?.items?.some((i) => i.text === listening?.text)).toBe(true);
  });
});

describe("the drop for 1.9", () => {
  type Drop = { pieces: { id: string; channel: string; text?: string; title?: string; waits?: string }[]; points: { text: string }[]; also: { text: string }[] };
  const drop = json<Drop>("docs/plans/v1.9/drop.json");

  it("names the three Plus voices only to say they are dropped, in every piece and step", () => {
    const named = drop.pieces
      .filter((p) => /\bfenrir\b|\bemma\b/i.test(`${p.title ?? ""} ${p.text ?? ""} ${p.waits ?? ""}`))
      .filter((p) => !/\bdropped\b/i.test(p.text ?? ""))
      .map((p) => p.id);
    expect(named).toEqual([]);
  });

  it.runIf(noTextRecorded)("sends no line that says a text beside the Bible is read aloud while none is", () => {
    const sent = [...drop.points.map((p) => p.text), ...drop.also.map((a) => a.text), ...drop.pieces.filter((p) => p.channel !== "step").map((p) => p.text ?? "")];
    expect(sent.filter((t) => TEXTS_ALOUD.test(t))).toEqual([]);
  });
});

describe("the FAQ", () => {
  const recorded = new Set(carriedChapters as string[]);
  const everyChapter = (books as { slug: string; chapters: number }[]).every((b) => Array.from({ length: b.chapters }, (_, i) => recorded.has(`${b.slug}/${i + 1}`)).every(Boolean));
  const en = json<Record<string, string>>("lib/i18n/messages/en.json");

  it.runIf(!everyChapter)("says only the New Testament is read aloud while the Old is not", () => {
    for (const key of ["faq.free.a1", "faq.roadmap.a"]) {
      expect(en[key], key).not.toMatch(/every chapter (?:of the Bible )?(?:can be )?read aloud/i);
      expect(en[key], key).toContain("New Testament");
    }
  });
});
