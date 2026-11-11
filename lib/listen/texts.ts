import { sentenceSpans } from "@/lib/marks/anchor";
import type { TextKind } from "@/lib/marks/placeAttr";

/**
 * Listen on the texts beside the Bible (1.9, the owner's word of 2026-11-10:
 * "make sure the Bible section, the saints' lives, the saints' works, the
 * ecumenical councils, the theology section ... Even the history section,
 * allow that to be read out").
 *
 * One recording is one thing a reader opens and hears through:
 *
 *   life/<saint>                       a saint's life, whole
 *   council/<council>/<document>/<n>   one section of a council's document
 *   theology/<study>/<n>               one part of a study
 *   history/<event>                    an event's account, whole
 *
 * It is made ahead, as the Bible's chapters are (lib/readAloud/chapters.ts):
 * a batch says what is read, sentence by sentence (ListenBatch, written by
 * scripts/listen-batches.mjs); the owner's render tool reads it in a voice
 * and hands back the sound and its timings (ListenTimings). The sound goes
 * to Purify's bucket; the timings stay with the website, small, with no copy
 * of the words in them: the page has the words.
 *
 * What is read is the text itself: the title, then its paragraphs, its
 * headings, the passages it quotes and its lists, in the page's order. An
 * editor's note above a council's text, a source line and a footnote are not
 * read. Pure: no file and no browser here.
 */

export type ListenKind = TextKind;

/** One block of a recording: a paragraph a reader can see lit (it has a place), or words read between them (it has none). */
export type BatchBlock = {
  /** The paragraph's place on its page: the part and the paragraph in it (components/reading/MarkHost.tsx). */
  at?: { sectionN: number; paragraphIdx: number };
  /** What it is, for the voice's pause before and after it. */
  kind: "title" | "heading" | "para" | "quote" | "item";
  sentences: string[];
};

export type ListenBatch = {
  id: string;
  /** The page it is read on. */
  href: string;
  title: string;
  /** Whose words: the council's, or Purify's own telling. */
  by: string;
  words: number;
  blocks: BatchBlock[];
};

/**
 * A recording's timings, as the render tool hands them back: one row a block
 * of the batch, in the batch's order, each sentence's start and end in
 * seconds. No words: the page has them.
 */
export type ListenTimings = {
  voice: string;
  seconds: number;
  blocks: { at?: { sectionN: number; paragraphIdx: number }; s: [number, number][] }[];
};

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function listenId(kind: ListenKind, slug: string, doc?: string, n?: number): string {
  if (kind === "council") return `council/${slug}/${doc}/${n}`;
  if (kind === "theology") return `theology/${slug}/${n}`;
  return `${kind}/${slug}`;
}

export type ListenRef =
  | { kind: "life"; slug: string }
  | { kind: "history"; slug: string }
  | { kind: "theology"; slug: string; n: number }
  | { kind: "council"; slug: string; doc: string; n: number };

/** What a recording's name says it is, or null when it is no recording's name. */
export function parseListenId(id: string): ListenRef | null {
  const parts = id.split("/");
  const [kind, slug] = parts;
  if (!slug || !SLUG.test(slug)) return null;
  const int = (v: string | undefined) => (v !== undefined && /^\d{1,4}$/.test(v) ? Number(v) : null);
  if ((kind === "life" || kind === "history") && parts.length === 2) return { kind, slug };
  if (kind === "theology" && parts.length === 3) {
    const n = int(parts[2]);
    return n === null ? null : { kind, slug, n };
  }
  if (kind === "council" && parts.length === 4 && SLUG.test(parts[2])) {
    const n = int(parts[3]);
    return n === null ? null : { kind, slug, doc: parts[2], n };
  }
  return null;
}

/** The page a recording is read on, at the part it reads. */
export function listenHref(ref: ListenRef): string {
  switch (ref.kind) {
    case "life":
      return `/saints/${ref.slug}`;
    case "history":
      return `/history/${ref.slug}`;
    case "theology":
      return `/theology/${ref.slug}/read`;
    case "council":
      return `/councils/${ref.slug}/${ref.doc}#s${ref.n}`;
  }
}

/** The key a paragraph is marked by on its page, from a recording's block (lib/marks/placeAttr.ts). */
export function hostKeyOf(ref: ListenRef, at: { sectionN: number; paragraphIdx: number }): string {
  const doc = ref.kind === "council" ? ref.doc : "-";
  return `text|${ref.kind}|${ref.slug}|${doc}|${at.sectionN}|${at.paragraphIdx}`;
}

/** A text as the voice is handed it: its sentences, whole, in order. */
export function sentencesOf(text: string): string[] {
  return sentenceSpans(text)
    .map((s) => text.slice(s.s, s.e))
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

const count = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** A batch from its blocks, with nothing empty in it. */
export function batchOf(id: string, title: string, by: string, blocks: BatchBlock[]): ListenBatch | null {
  const ref = parseListenId(id);
  const kept = blocks.filter((b) => b.sentences.length > 0);
  if (!ref || !kept.some((b) => b.at)) return null;
  return { id, href: listenHref(ref), title, by, words: kept.reduce((n, b) => n + b.sentences.reduce((m, s) => m + count(s), 0), 0), blocks: kept };
}

/** Whether timings answer a batch block for block: the same blocks in the same places, a time for every sentence, none running backwards. */
export function timingsFit(batch: ListenBatch, timings: ListenTimings): string | null {
  if (timings.blocks.length !== batch.blocks.length) return `${timings.blocks.length} blocks timed, ${batch.blocks.length} read`;
  let last = 0;
  for (let i = 0; i < batch.blocks.length; i += 1) {
    const read = batch.blocks[i];
    const timed = timings.blocks[i];
    if ((read.at?.sectionN ?? -1) !== (timed.at?.sectionN ?? -1) || (read.at?.paragraphIdx ?? -1) !== (timed.at?.paragraphIdx ?? -1)) return `block ${i} is another place`;
    if (timed.s.length !== read.sentences.length) return `block ${i}: ${timed.s.length} sentences timed, ${read.sentences.length} read`;
    for (const [from, to] of timed.s) {
      if (!(from >= last - 0.01) || !(to > from)) return `block ${i}: a sentence's time runs backwards`;
      last = to;
    }
  }
  if (!(timings.seconds >= last - 0.01)) return "the recording ends before its last sentence";
  return null;
}
