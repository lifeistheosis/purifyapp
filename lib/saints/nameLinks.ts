import { SAINT_NAME_FORMS } from "./nameIndex.generated";

/**
 * A text cut where a saint is named (1.8): each part either plain or a name
 * that opens the saint's card. The parts join back into the text exactly.
 * A name counts only whole (never inside a longer word), as written (names
 * are capitalised), and with a "St", "St." or "Saint" before it taken in. Only
 * a saint's first naming in the text is a part of its own, so a paragraph
 * that names St Basil five times links him once, and `skip` (the saint whose
 * page this is) is never linked at all.
 */
export type NamePart = { text: string; slug?: string };

const SLUG = new Map(SAINT_NAME_FORMS);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAMES_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(?:Saints?|Sts?\\.?) )?(${SAINT_NAME_FORMS.map(([f]) => escape(f)).join("|")})(?![\\p{L}\\p{N}])`,
  "gu",
);

/**
 * `skip` is the saint not to link, or a set of saints already linked, which
 * the call adds to: several pieces of one paragraph then link each saint once.
 */
export function segmentNames(text: string, skip?: string | Set<string>): NamePart[] {
  const parts: NamePart[] = [];
  const done = skip instanceof Set ? skip : new Set<string>(skip ? [skip] : []);
  let from = 0;
  for (const m of text.matchAll(NAMES_RE)) {
    const slug = SLUG.get(m[1]);
    if (!slug || done.has(slug)) continue;
    done.add(slug);
    const at = m.index ?? 0;
    if (at > from) parts.push({ text: text.slice(from, at) });
    parts.push({ text: m[0], slug });
    from = at + m[0].length;
  }
  if (from < text.length || !parts.length) parts.push({ text: text.slice(from) });
  return parts;
}
