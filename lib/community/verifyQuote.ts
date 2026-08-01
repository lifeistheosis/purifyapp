import "server-only";
import { loadVerseRange } from "@/lib/bible/load";
import { loadWriting } from "@/lib/saints/load";
import { getSaint } from "@/lib/saints/saints";

/**
 * Proves that a shared quotation actually comes from Purify's own vetted
 * library, on the SERVER.
 *
 * The composer only ever offers lines from the reader's Florilegium, and the
 * file that renders it says so: "no fresh doctrinal text enters the app
 * through this surface". That was true of the UI and false of the API. The
 * route accepted any `quoteText` and any `quoteSource` from any authenticated
 * caller, with a single server-side check that the link began with "/". A
 * token and curl could post `kind: "father"` with invented text and an
 * invented attribution, and it rendered in a gold-bordered blockquote that
 * reads as vetted. `docs/editorial-standards.md` is binding and says "no
 * invented patristic text ever".
 *
 * So the client no longer supplies the text at all for Scripture, and for a
 * Father it supplies text that must be found verbatim in the cited work.
 *
 *   scripture  the client sends book/chapter/verse; we load the verse and
 *              build both the text and the citation ourselves. Nothing the
 *              client typed survives.
 *   father     the client sends saintSlug + work + the text; we load that
 *              work and require the text to appear in it. A quote that is
 *              not in the work it claims is refused.
 *
 * A Father item with no saintSlug/work cannot be verified and is refused
 * rather than trusted. That is a deliberate narrowing: it is better to lose
 * a legitimate share than to publish one invented quotation under a saint's
 * name.
 */

export type VerifiedQuote = {
  quoteText: string;
  quoteSource: string;
  quoteHref: string | null;
};

export type QuoteRefusal = { reason: string };

/** Collapse whitespace and normalise quotes/dashes so a faithful copy matches. */
function normalise(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function verifyScriptureQuote(input: {
  book?: string | null;
  chapter?: number | null;
  verse?: number | null;
}): Promise<VerifiedQuote | QuoteRefusal> {
  const { book, chapter, verse } = input;
  if (!book || !chapter || !verse) {
    return { reason: "A shared verse needs its book, chapter and verse." };
  }
  if (!/^[a-z0-9-]+$/.test(book)) {
    return { reason: "That is not a book we carry." };
  }

  const passage = await loadVerseRange(book, chapter, verse, verse);
  const line = passage?.verses?.[0];
  if (!line) {
    return { reason: "We could not find that verse in our Scripture." };
  }

  // Built here, not accepted from the caller.
  return {
    quoteText: line.text.trim(),
    quoteSource: `${passage.name} ${chapter}:${verse}`,
    quoteHref: `/bible/${book}/${chapter}`,
  };
}

export async function verifyFatherQuote(input: {
  saintSlug?: string | null;
  work?: string | null;
  text?: string | null;
}): Promise<VerifiedQuote | QuoteRefusal> {
  const { saintSlug, work, text } = input;
  if (!saintSlug || !work || !text?.trim()) {
    return {
      reason:
        "A shared line from the Fathers has to name the work it came from.",
    };
  }
  if (!/^[a-z0-9-]+$/.test(saintSlug) || !/^[a-z0-9-]+$/.test(work)) {
    return { reason: "That is not a work we carry." };
  }

  const saint = getSaint(saintSlug);
  if (!saint) return { reason: "That is not a saint we carry." };

  const content = await loadWriting(saintSlug, work);
  if (!content) return { reason: "That is not a work we carry." };

  // The submitted text must appear in the work, verbatim once whitespace and
  // curly punctuation are normalised. Checked against the whole work rather
  // than one paragraph, because a reader may have gathered a line that spans
  // a paragraph break.
  const haystack = normalise(
    content.sections.flatMap((s) => s.paragraphs).join(" "),
  );
  const needle = normalise(text);
  if (needle.length < 12) {
    return { reason: "That line is too short to attribute." };
  }
  if (!haystack.includes(needle)) {
    return {
      reason:
        "We could not find that line in the work it is credited to, so we have not published it.",
    };
  }

  return {
    quoteText: text.trim(),
    quoteSource: `${saint.name}, ${content.title}`,
    quoteHref: `/saints/${saintSlug}/${work}`,
  };
}

export function isRefusal(
  v: VerifiedQuote | QuoteRefusal,
): v is QuoteRefusal {
  return "reason" in v;
}
