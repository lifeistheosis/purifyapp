import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * WHOSE WORDS the paragraphs of a section are. Declared, never inferred.
 *
 *   saint       the saint's own words, verbatim in a public-domain edition
 *   scripture   verbatim Scripture
 *   liturgical  verbatim liturgical text (a troparion, a kontakion): the
 *               Church's words, often ABOUT the saint and not by him
 *   witness     another named author's verbatim words ABOUT this saint:
 *               Athanasius narrating the Life of Antony, Sozomen on
 *               Nectarius, the church of Smyrna on the martyrdom of
 *               Polycarp. Verbatim and public-domain like `saint`, but not
 *               his, and the distinction is the whole point: the Martyrdom
 *               of Polycarp opens "The Church of God which sojourns at
 *               Smyrna, to the Church of God sojourning in Philomelium",
 *               and sits today on Polycarp's page under his name.
 *   editorial   Purify's prose: a retelling, a summary, a synthesis
 *
 * WHY THIS IS A FIELD AND NOT A GUESS. Attribution used to rest on two
 * signals, both unreliable. Reading the work's prose `source` string fails
 * outright: St Seraphim's Spiritual Instructions are sourced "Compiled from
 * the saint's oral teaching", which describes how the words were gathered,
 * not who spoke them, so any regex reads his verbatim teaching as a
 * retelling. Reading the presence of `framing` and `citation` is better but
 * still cannot answer "whose words", only "is there a second register": St
 * Nicholas's stories-and-prayers holds a narrative retelling in one section
 * and the Byzantine troparion in the next, both with framing, under a single
 * `source`. The troparion is verbatim text that Nicholas did not write.
 *
 * A wrong attribution here does not merely mislead a reader who is skimming.
 * It is emitted as structured data and propagates into every model that
 * reads the site, which is the sort of error that is never corrected.
 *
 * Optional for now: sections without it render exactly as before and are
 * treated as unlabelled rather than assumed to be the saint.
 */
export type SectionVoice =
  | "saint"
  | "scripture"
  | "liturgical"
  | "witness"
  | "editorial";

/**
 * Who actually spoke, when it is not the saint whose page this is. Set
 * alongside `voice: "witness"` so the reader and the structured data can
 * name them ("Recorded by Athanasius") instead of a bare disclaimer.
 */
export type SectionVoiceAuthor = string;

export type Section = {
 n: number;
 title: string;
 /** Whose words `paragraphs` are. See SectionVoice. */
 voice?: SectionVoice;
 /** With `voice: "witness"`, who spoke. E.g. "Athanasius of Alexandria". */
 voiceAuthor?: SectionVoiceAuthor;
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
 /**
  * BCP-47 code of the language this was translated FROM ("grc", "la",
  * "syr"). Optional and deliberately not backfilled by inference: guessing
  * a source language from a saint's name is the same class of mistake
  * `voice` exists to stop. When set, the structured data declares the page
  * a translation, so a machine knows it is not reading the original.
  */
 originalLanguage?: string;
 /** The work's title in its original language, when known. */
 originalTitle?: string;
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
