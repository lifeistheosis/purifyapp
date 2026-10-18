import "server-only";

import { loadCommentary } from "@/lib/bible/load";
import type { ShownCite } from "@/lib/citations/cite";
import { shownWork, workFile } from "@/lib/citations/shown";

import type { ContextCard } from "./types";

/**
 * Where each Father's line in a walk's notes stands, exactly (1.8): the
 * paragraph of the library's copy of his work that holds the excerpt, by
 * the work's own divisions (St Gregory's Morals, Book 5, §82), which the
 * note's line names and opens. Until now the line named the work alone
 * ("St. Gregory the Great, Morals on the Book of Job").
 *
 * A note's line is cut from an entry of the Bible's commentary (its `verse`
 * and `index`), and every entry from a work the library holds names where
 * it begins there (`at`, scripts/place-commentary.mjs). The excerpt is looked
 * for from that paragraph on, by its own words, so the place is the excerpt's
 * and not only its entry's. Built on the server with the chapter's page; a
 * line that cannot be placed keeps the walk's own credit.
 */

const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** How far past the entry's first paragraph an excerpt is looked for. */
const REACH = 40;

export async function fatherCites(book: string, chapter: number, cards: readonly ContextCard[]): Promise<Record<string, ShownCite>> {
  const lines = cards.filter((c) => c.father);
  if (!lines.length) return {};
  const commentary = await loadCommentary(book, chapter);
  const out: Record<string, ShownCite> = {};
  for (const card of lines) {
    const father = card.father!;
    const note = commentary[String(father.verse)]?.[father.index];
    if (!note?.at) continue;
    const [saint, work] = note.at.work.split("/");
    const file = workFile(saint, work);
    if (!file) continue;
    const anchor = words(father.excerpt).split(" ").slice(0, 12).join(" ");
    const start = file.sections.findIndex((s) => s.n === note.at!.section);
    if (start < 0 || !anchor) continue;
    let found: { section: number; paragraph: number } | null = null;
    let seen = 0;
    for (let s = start; s < file.sections.length && !found && seen <= REACH; s++) {
      const sec = file.sections[s];
      for (let i = s === start ? note.at.paragraph : 0; i < sec.paragraphs.length && seen <= REACH; i++, seen++) {
        if (words(sec.paragraphs[i]).includes(anchor)) {
          found = { section: sec.n, paragraph: i };
          break;
        }
      }
    }
    if (!found) continue;
    const cite = shownWork({ saint, work, ...found });
    if (cite) out[card.id] = cite;
  }
  return out;
}
