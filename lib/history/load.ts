// Loader for a history event's full body, read server-side from
// data/history/<slug>.json. The registry in events.ts is the index; this is
// the narrative. Mirrors lib/theology/load.ts.

import fs from "node:fs/promises";
import path from "node:path";

import type { EssayBlock } from "@/lib/theology/load";
import { eventBySlug } from "./events";

/** One visible citation. Every published event must have at least one —
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

export type HistoryEventBody = {
  slug: string;
  /** The full historical narrative, in theology's EssayBlock shape. */
  narrative: EssayBlock[];
  /** The world before: what the reader needs to understand the moment. */
  context?: EssayBlock[];
  /** Why this matters to Orthodoxy — the theological reading. */
  significance?: EssayBlock[];
  /** What flowed from it. */
  consequences?: EssayBlock[];
  /** Where the account is uncertain or disputed, said plainly. */
  uncertainty?: string;
  sources: SourceCitation[];
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
