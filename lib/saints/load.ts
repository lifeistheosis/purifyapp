import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Whose words `paragraphs` holds. Explicit, never inferred.
 *
 * The corpus goal is 100% verbatim: every paragraph a real text from a
 * public-domain source, quoted exactly. `editorial` exists so that anything
 * not yet meeting that bar is visibly and machine-readably marked as
 * Purify's prose rather than passing as the saint speaking. It is a debt
 * marker, not a content type.
 *
 * - `saint`      the saint's own words in a public-domain translation
 * - `scripture`  canonical Scripture, quoted exactly
 * - `liturgical` hymnography or prayer, verbatim, authored by the Church
 * - `editorial`  Purify's own prose. Never rendered as the saint speaking.
 */
export type Voice = "saint" | "scripture" | "liturgical" | "editorial";

export type Section = {
  n: number;
  title: string;
  /** Required. See {@link Voice}. */
  voice: Voice;
  /**
   * Editorial intro placed ABOVE the saint's words: context, dating, the
   * commentator's reading. One paragraph, roughly ~120 words. Optional. When
   * present, signals the section has two distinct registers — editor's voice
   * (this field) and the saint's own text (paragraphs). Older entries
   * without `framing` render `paragraphs` directly, which is correct when
   * the whole section is the saint's writing.
   */
  framing?: string;
  /**
   * Source attribution for `paragraphs`, e.g. "Philippians 4:11-13 (KJV)" or
   * "Byzantine troparion, December 6". Rendered as a small eyebrow above the
   * paragraphs so the reader knows the text below is from that source.
   * Optional.
   */
  citation?: string;
  /**
   * The text of the section. When `framing` is absent this is the saint's
   * own writing (e.g. Chrysostom's homily). When `framing` is present this
   * is either an extracted quotation (citation set) or a faithful retelling
   * (citation omitted — the framing acknowledges that).
   */
  paragraphs: string[];
  /**
   * Editorial marginalia — short reading notes shown in the right column.
   * Each entry is one note (1-2 sentences). Optional.
   */
  notes?: string[];
};

export type WritingContent = {
  saint: string;
  slug: string;
  title: string;
  subtitle?: string;
  source: string;
  sections: Section[];
};

const DATA_DIR = path.join(process.cwd(), "data", "saints");

export async function loadWriting(
  saintSlug: string,
  workSlug: string,
): Promise<WritingContent | null> {
  try {
    const file = path.join(DATA_DIR, saintSlug, `${workSlug}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as WritingContent;
  } catch {
    return null;
  }
}
