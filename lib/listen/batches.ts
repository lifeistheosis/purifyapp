import "server-only";

import { COUNCILS } from "@/lib/councils/councils";
import { loadCouncilDocument } from "@/lib/councils/load";
import { publishedEvents } from "@/lib/history/events";
import { loadEventBody } from "@/lib/history/load";
import { loadWriting } from "@/lib/saints/load";
import { SAINTS } from "@/lib/saints/saints";
import { loadTopicBody, type EssayBlock } from "@/lib/theology/load";
import { studyPassages } from "@/lib/theology/passages";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";

import { batchOf, listenId, sentencesOf, type BatchBlock, type ListenBatch } from "@/lib/listen/texts";

/**
 * Everything that is read aloud beside the Bible, as the owner's render tool
 * is handed it (./texts.ts, scripts/listen-batches.mjs): one batch a
 * recording, read from the same files the pages are drawn from, each
 * paragraph named by the place its page gives it
 * (components/reading/MarkHost.tsx), so the reader lights the paragraph being
 * read. lib/listen/__tests__/batches.test.ts holds the two together.
 *
 * In the order his PC records them (his word of 2026-11-11, through the
 * arbiter): the lives, the councils, theology, history, then the Lives that
 * are a witness's own words.
 */

/** An essay's block as the voice reads it; a paragraph keeps its place in its part. */
function essayBlock(block: EssayBlock, sectionN: number, paragraphIdx: number, quotesHavePlaces = false): BatchBlock[] {
  switch (block.kind) {
    case "heading":
      return [{ kind: "heading", sentences: sentencesOf(block.text) }];
    case "blockquote":
      // A quoted passage has its own place on an event's page (components/history/EventArticle.tsx) and is lit as it is read.
      return [{ kind: "quote", ...(quotesHavePlaces ? { at: { sectionN, paragraphIdx } } : {}), sentences: sentencesOf(block.text) }];
    case "list":
      // On an event's page the list is one place, lit whole while its items are read.
      if (quotesHavePlaces) return [{ kind: "item", at: { sectionN, paragraphIdx }, sentences: block.items.flatMap((item) => sentencesOf(item)) }];
      return block.items.map((item) => ({ kind: "item" as const, sentences: sentencesOf(item) }));
    default:
      return [{ kind: "para", at: { sectionN, paragraphIdx }, sentences: sentencesOf(block.text) }];
  }
}

const title = (text: string): BatchBlock => ({ kind: "title", sentences: [text.replace(/[.\s]+$/, "") + "."] });

/** Purify's own telling is signed Purify, as a copy of its words is. */
const OURS = "Purify";

export async function lifeBatches(): Promise<ListenBatch[]> {
  const out: ListenBatch[] = [];
  for (const saint of SAINTS) {
    if (!saint.life?.length) continue;
    const name = `The life of ${saint.name}`;
    const batch = batchOf(listenId("life", saint.slug), name, OURS, [
      title(name),
      ...saint.life.map((p, i) => ({ kind: "para" as const, at: { sectionN: 1, paragraphIdx: i }, sentences: sentencesOf(p) })),
    ]);
    if (batch) out.push(batch);
  }
  return out;
}

export async function councilBatches(): Promise<ListenBatch[]> {
  const out: ListenBatch[] = [];
  for (const council of COUNCILS) {
    for (const doc of council.documents) {
      // A document read elsewhere in the app (the Tome of St Leo, among his works) has no page here.
      if (doc.href) continue;
      const content = (await loadCouncilDocument(council.slug, doc.slug))?.content;
      // A document that is not sections of text (a list, a table) has nothing to read through.
      if (!content || !Array.isArray(content.sections)) continue;
      for (const s of content.sections) {
        if (!Array.isArray(s.paragraphs)) continue;
        // The section's own title, then its words. The editor's note above them is ours and is not read.
        const head = s.title && s.title !== content.title ? `${content.title}. ${s.title}` : content.title;
        const batch = batchOf(listenId("council", council.slug, doc.slug, s.n), head, council.byname, [
          title(head),
          ...s.paragraphs.map((p, i) => ({ kind: "para" as const, at: { sectionN: s.n, paragraphIdx: i }, sentences: sentencesOf(p) })),
        ]);
        if (batch) out.push(batch);
      }
    }
  }
  return out;
}

export async function theologyBatches(): Promise<ListenBatch[]> {
  const out: ListenBatch[] = [];
  for (const topic of THEOLOGY_TOPICS) {
    if (topic.planned) continue;
    const body = await loadTopicBody(topic.slug);
    if (!body) continue;
    const { passages, placed } = studyPassages(body);
    placed.parts.forEach((part, i) => {
      const n = i + 1;
      const blocks: BatchBlock[] = [];
      if (i === 0) {
        blocks.push(title(topic.title));
        // The summary stands before the first part: part 0 on the page.
        if (body.summary) blocks.push({ kind: "para", at: { sectionN: 0, paragraphIdx: 0 }, sentences: sentencesOf(body.summary) });
      } else if (part.heading) {
        blocks.push({ kind: "heading", sentences: sentencesOf(part.heading.replace(/[.\s]+$/, "") + ".") });
      }
      part.blocks.forEach((b, j) => blocks.push(...essayBlock(b, n, j)));
      // The part's Fathers, as the deck at its end sets them: who speaks and where, then his words.
      const deck = [...part.passages, ...(i === placed.parts.length - 1 ? placed.end : [])].map((j) => passages[j]);
      for (const p of deck) {
        const whose = [p.name, p.work].filter(Boolean).join(", ");
        if (whose) blocks.push({ kind: "heading", sentences: [whose.replace(/[.\s]+$/, "") + "."] });
        blocks.push({ kind: "quote", sentences: sentencesOf(p.text) });
      }
      const batch = batchOf(listenId("theology", topic.slug, undefined, n), i === 0 || !part.heading ? topic.title : `${topic.title}. ${part.heading}`, OURS, blocks);
      if (batch) out.push(batch);
    });
  }
  return out;
}

export async function historyBatches(): Promise<ListenBatch[]> {
  const out: ListenBatch[] = [];
  for (const event of publishedEvents()) {
    const body = await loadEventBody(event.slug);
    if (!body) continue;
    // The page's four runs of the account, in its order (components/history/EventArticle.tsx).
    const runs: [number, EssayBlock[] | undefined][] = [
      [1, body.context],
      [2, body.narrative],
      [3, body.significance],
      [4, body.consequences],
    ];
    const blocks: BatchBlock[] = [title(event.title)];
    for (const [sectionN, run] of runs) (run ?? []).forEach((b, i) => blocks.push(...essayBlock(b, sectionN, i, true)));
    const batch = batchOf(listenId("history", event.slug), event.title, OURS, blocks);
    if (batch) out.push(batch);
  }
  return out;
}

/** A work's name that says it is a Life, a martyrdom or the acts of a saint. */
const A_LIFE = /(^|-)(life|lives|martyrdom|passion|death-of)(-|$)|^acts-of-|life-by-/;
/** Works with "life" in their name that are a saint's own writing, not a Life of him. */
const NOT_A_LIFE = new Set(["my-life-in-christ"]);

/**
 * Whether a work in the reading room is a saint's Life in a witness's own
 * words: most of its sections are declared a witness's (lib/saints/load.ts,
 * SectionVoice), or its name says so. Only for choosing what his PC records
 * first; nothing a reader sees is decided by it.
 */
export function isLifeWork(workSlug: string, sections: readonly { voice?: string }[]): boolean {
  if (NOT_A_LIFE.has(workSlug)) return false;
  const witness = sections.filter((s) => s.voice === "witness").length;
  return witness * 2 >= sections.length && witness > 0 ? true : A_LIFE.test(workSlug);
}

/**
 * The Lives that are a witness's own words (the Life of Antony by St
 * Athanasius, the Martyrdom of Polycarp): works in the reading room, one
 * recording a section, read in the works reader. His word named the saints'
 * lives first, so his PC records these before the Old Testament (the
 * arbiter, 2026-11-11). A Life that stands under two saints is recorded for
 * each page it stands on.
 */
export async function lifeWorkBatches(): Promise<ListenBatch[]> {
  const out: ListenBatch[] = [];
  for (const saint of SAINTS) {
    for (const work of saint.works ?? []) {
      const content = await loadWriting(saint.slug, work.slug);
      if (!content || !Array.isArray(content.sections) || !isLifeWork(work.slug, content.sections)) continue;
      for (const s of content.sections) {
        if (!Array.isArray(s.paragraphs)) continue;
        const head = s.title && s.title !== content.title ? `${content.title}. ${s.title}` : content.title;
        // Whose words: the witness the section names, else the saint whose page it is. The editor's note above is not read.
        const batch = batchOf(listenId("work", saint.slug, work.slug, s.n), head, s.voiceAuthor ?? saint.name, [
          title(head),
          ...s.paragraphs.map((p, i) => ({ kind: "para" as const, at: { sectionN: s.n, paragraphIdx: i }, sentences: sentencesOf(p) })),
        ]);
        if (batch) out.push(batch);
      }
    }
  }
  return out;
}

export type BatchGroup = "lives" | "councils" | "theology" | "history" | "lives-in-their-witnesses";

/** Every batch, in the order his PC records them. */
export async function allBatches(): Promise<{ group: BatchGroup; batches: ListenBatch[] }[]> {
  return [
    { group: "lives", batches: await lifeBatches() },
    { group: "councils", batches: await councilBatches() },
    { group: "theology", batches: await theologyBatches() },
    { group: "history", batches: await historyBatches() },
    { group: "lives-in-their-witnesses", batches: await lifeWorkBatches() },
  ];
}
