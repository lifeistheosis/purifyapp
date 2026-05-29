import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type Section = {
 n: number;
 title: string;
 /**
 * Editorial intro placed ABOVE the saint's words: context, dating, the
 * commentator's reading. One paragraph, roughly ~120 words. Optional. When
 * present, signals the section has two distinct registers, editor's voice
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
 * (citation omitted, the framing acknowledges that).
 */
 paragraphs: string[];
 /**
 * Editorial marginalia, short reading notes shown in the right column.
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

/**
 * Load a writing by slug. When a non-default `locale` is provided we look
 * first for `data/saints/{slug}/i18n/{locale}/{work}.json`, then fall back
 * to the English source at `data/saints/{slug}/{work}.json`. Returns the
 * content plus an `isLocalized` flag so the page can show a banner when
 * the fallback fired.
 */
export async function loadWriting(
 saintSlug: string,
 workSlug: string,
 locale: string = "en",
): Promise<(WritingContent & { isLocalized: boolean }) | null> {
 const tryLocale =
 locale && locale !== "en"
 ? path.join(DATA_DIR, saintSlug, "i18n", locale, `${workSlug}.json`)
 : null;
 const fallback = path.join(DATA_DIR, saintSlug, `${workSlug}.json`);

 if (tryLocale) {
 try {
 const raw = await fs.readFile(tryLocale, "utf8");
 return { ...(JSON.parse(raw) as WritingContent), isLocalized: true };
 } catch {
 /* fall through to English */
 }
 }
 try {
 const raw = await fs.readFile(fallback, "utf8");
 return { ...(JSON.parse(raw) as WritingContent), isLocalized: locale === "en" };
 } catch {
 return null;
 }
}
