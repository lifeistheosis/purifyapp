// Loader for a history event's full body, read server-side from
// data/history/<slug>.json. The registry in events.ts is the index; this is
// the narrative. Mirrors lib/theology/load.ts.

import fs from "node:fs/promises";
import path from "node:path";

import type { EssayBlock } from "@/lib/theology/load";
import { eventBySlug } from "./events";

/** One visible citation. Every published event must have at least one,
 *  enforced by lib/history/__tests__/events.integrity.test.ts. */
export type SourceCitation = {
  /** Printed citation line, e.g. "Eusebius, Church History, Book X". */
  label: string;
  /** Author, when not part of the label. */
  author?: string;
  /** "primary" = ancient text / conciliar act; "secondary" = scholarship. */
  kind: "primary" | "secondary";
  /** Public-domain or stable reference URL (CCEL, NewAdvent, archives). */
  url?: string;
  /** Editorial note: what this source supports. */
  note?: string;
};

/** One dated step inside a long event, for the account's own timeline.
 *  `date` is printed exactly as written and is never parsed or inferred, so
 *  a step may be as loose as "January 1439" or as firm as "6 July 1439";
 *  the registry's `precision` still governs the event as a whole. */
export type ChronologyEntry = {
  /** Printed date line, e.g. "6 July 1439". */
  date: string;
  /** What happened at that date, one sentence. */
  text: string;
  /** The turning points, drawn heavier than the surrounding steps. */
  pivotal?: boolean;
};

/** One person of the event, in the order they matter to it (1.7). */
export type EventPerson = {
  /** As the page prints it: "St Athanasius of Alexandria", "Arius". */
  name: string;
  /** The saint's page, when the person is a saint the app has (lib/saints). */
  saint?: string;
  /** One line: who they were in this event. */
  role: string;
};

/**
 * The mark every text written to the 1.7 standard carries (the owner's
 * standing note of 2026-10-16: no priest reviews Purify yet, so each text is
 * made as canonical as possible now and kept findable for a future clergy
 * review). Data only: readers are not shown it.
 */
export type EventReview = {
  status: "awaiting-clergy-review";
  /** The day the text was written, YYYY-MM-DD. */
  drafted: string;
  /** What the text rests on, and what in it is paraphrase. */
  basis: string;
};

/**
 * An event's account, in the four parts every event page has (1.7):
 *  - What happened: `context`, then `narrative`, then `chronology`;
 *  - Why it matters: `significance`, then `consequences`;
 *  - The people: `people` (or, for an older account without them, the
 *    saints the registry links);
 *  - Sources: how sure we are (`uncertainty` with the registry's certainty),
 *    the sources, and the registry's Scripture.
 */
export type HistoryEventBody = {
  slug: string;
  /** The full historical narrative, in theology's EssayBlock shape. */
  narrative: EssayBlock[];
  /** The world before: what the reader needs to understand the moment. */
  context?: EssayBlock[];
  /** Dated steps for events that unfold over months or years. Optional:
   *  a point event has nothing to lay out. */
  chronology?: ChronologyEntry[];
  /** Why this matters to Orthodoxy, the theological reading. */
  significance?: EssayBlock[];
  /** What flowed from it. */
  consequences?: EssayBlock[];
  /** Where the account is uncertain or disputed, said plainly. */
  uncertainty?: string;
  /** The people of the event (1.7), in order. */
  people?: EventPerson[];
  sources: SourceCitation[];
  /** Present on every text written to the 1.7 standard. */
  review?: EventReview;
};

const DATA_DIR = path.join(process.cwd(), "data", "history");

export async function loadEventBody(slug: string): Promise<HistoryEventBody | null> {
  // Drafts and unknown slugs load nothing, so a draft can never route.
  if (!eventBySlug(slug)) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw) as HistoryEventBody;
  } catch {
    return null;
  }
}
