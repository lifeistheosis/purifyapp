import "server-only";

import { COUNCILS } from "@/lib/councils/councils";
import { loadCouncilDocument } from "@/lib/councils/load";
import { publishedEvents } from "@/lib/history/events";
import { loadEventBody } from "@/lib/history/load";
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
 * arbiter): the lives, the councils, theology, history.
 */

/** An essay's block as the voice reads it; a paragraph keeps its place in its part. */
function essayBlock(block: EssayBlock, sectionN: number, paragraphIdx: number): BatchBlock[] {
  switch (block.kind) {
    case "heading":
      return [{ kind: "heading", sentences: sentencesOf(block.text) }];
    case "blockquote":
      return [{ kind: "quote", sentences: sentencesOf(block.text) }];
    case "list":
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
    for (const [sectionN, run] of runs) (run ?? []).forEach((b, i) => blocks.push(...essayBlock(b, sectionN, i)));
    const batch = batchOf(listenId("history", event.slug), event.title, OURS, blocks);
    if (batch) out.push(batch);
  }
  return out;
}

/** Every batch, in the order his PC records them. */
export async function allBatches(): Promise<{ group: "lives" | "councils" | "theology" | "history"; batches: ListenBatch[] }[]> {
  return [
    { group: "lives", batches: await lifeBatches() },
    { group: "councils", batches: await councilBatches() },
    { group: "theology", batches: await theologyBatches() },
    { group: "history", batches: await historyBatches() },
  ];
}
