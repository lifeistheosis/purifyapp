/**
 * JSON-LD builders.
 *
 * The goal is not "have schema markup". The goal is that a machine reading
 * one of these pages can answer, without guessing: who is this person, when
 * did they live, what did they write, who translated it, and are these words
 * actually theirs. That last question is why this file is careful about the
 * difference between a saint's text and an editorial retelling of it.
 */

import { SITE } from "@/lib/site";
import type { Saint, Work } from "@/lib/saints/saints";
import type { WritingContent } from "@/lib/saints/load";
import { sameAsFor } from "@/lib/saints/authority";

// A loose type. JSON-LD is an open vocabulary and over-typing it here would
// cost more than it catches.
export type JsonLd = Record<string, unknown>;

const abs = (path: string) => `${SITE}${path}`;

/* -------------------------------------------------------------------------
 * Dates
 *
 * The corpus dates are human prose: "c. 296 (Alexandria)", "May 2, 373",
 * "c. AD 5 (Tarsus in Cilicia)". schema.org date fields expect ISO 8601.
 * An approximate date must never be emitted as if it were exact, so anything
 * hedged with "c." is deliberately dropped from the ISO fields and survives
 * only in the human-readable description.
 * ---------------------------------------------------------------------- */

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

const isApproximate = (raw: string) => /\bc\.\s/i.test(raw);

/** "May 2, 373" to "0373-05-02". Returns null for anything approximate. */
function toIsoDate(raw?: string): string | null {
  if (!raw || isApproximate(raw)) return null;
  const m = raw.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{1,4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3].padStart(4, "0")}-${month}-${m[2].padStart(2, "0")}`;
}

/** "949 (Galatia)" to "0949". Returns null for anything approximate. */
function toIsoYear(raw?: string): string | null {
  if (!raw || isApproximate(raw)) return null;
  const m = raw.match(/\b(\d{1,4})\b/);
  return m ? m[1].padStart(4, "0") : null;
}

/** The parenthetical in "c. 296 (Alexandria)". */
function placeFrom(raw?: string): string | null {
  const m = raw?.match(/\(([^)]+)\)/);
  return m ? m[1] : null;
}

/* -------------------------------------------------------------------------
 * Attribution
 *
 * To present editorial prose as a Book authored by the saint would hand
 * every downstream LLM a false attribution, which is the one failure mode
 * this whole exercise exists to prevent.
 *
 * This used to be inferred by regex over the work's `source` string. It is
 * now read from each section's explicit `voice`, because the inference was
 * demonstrably wrong in both directions.
 * ---------------------------------------------------------------------- */

/** True when every section is a real text, none of it Purify's prose. */
export function isOwnWords(content: WritingContent): boolean {
  return content.sections.every((s) => s.voice !== "editorial");
}

/** Sections that may be quoted as somebody's actual words. */
function verbatimSections(content: WritingContent) {
  return content.sections.filter((s) => s.voice !== "editorial");
}

/* ---------------------------------------------------------------------- */

/** Stable @id for a saint as a Person, independent of the page it appears on. */
export const personId = (slug: string) => abs(`/saints/${slug}#person`);

/**
 * A saint as a Person. Emitted standalone here so it can be referenced by
 * @id from writing pages without being duplicated in full.
 */
export function personSchema(saint: Saint): JsonLd {
  const birthDate = toIsoDate(saint.born) ?? toIsoYear(saint.born);
  const deathDate = toIsoDate(saint.reposed) ?? toIsoYear(saint.reposed);
  const birthPlace = placeFrom(saint.born);
  const deathPlace = placeFrom(saint.reposed);

  return {
    "@type": "Person",
    "@id": personId(saint.slug),
    name: saint.name,
    ...(saint.byname ? { alternateName: saint.byname } : {}),
    honorificPrefix: "Saint",
    description: saint.shortBio,
    url: abs(`/saints/${saint.slug}`),
    ...(saint.iconUrl ? { image: abs(saint.iconUrl) } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(deathDate ? { deathDate } : {}),
    ...(birthPlace ? { birthPlace: { "@type": "Place", name: birthPlace } } : {}),
    ...(deathPlace ? { deathPlace: { "@type": "Place", name: deathPlace } } : {}),
    ...(saint.see ? { affiliation: { "@type": "Organization", name: saint.see } } : {}),
    knowsAbout: Array.from(new Set(saint.works.flatMap((w) => w.topics ?? []))),
    // Feast days carry no year, so they cannot be a date field. As named
    // properties they stay machine-readable and keep their meaning.
    additionalProperty: [
      ...saint.feastDays.map((d) => ({
        "@type": "PropertyValue",
        name: "Feast day",
        value: d,
      })),
      ...(isApproximate(saint.born ?? "") || isApproximate(saint.reposed ?? "")
        ? [
            {
              "@type": "PropertyValue",
              name: "Dates",
              value: `${saint.born ?? "unknown"} to ${saint.reposed ?? "unknown"}`,
              description: "Traditional dating; approximate where hedged.",
            },
          ]
        : []),
    ],
    sameAs: sameAsFor(saint.slug),
    subjectOf: saint.works.map((w) => ({
      "@type": "CreativeWork",
      name: w.title,
      url: abs(`/saints/${saint.slug}/${w.slug}`),
    })),
  };
}

/** VARIATION 1: the saint profile page. ProfilePage wrapping a Person. */
export function saintProfileSchema(saint: Saint): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": abs(`/saints/${saint.slug}#page`),
    url: abs(`/saints/${saint.slug}`),
    name: `${saint.name}, life and writings`,
    description: saint.shortBio,
    inLanguage: "en",
    isPartOf: { "@id": abs("/#website") },
    mainEntity: personSchema(saint),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Saints", item: abs("/saints") },
        { "@type": "ListItem", position: 2, name: saint.name, item: abs(`/saints/${saint.slug}`) },
      ],
    },
  };
}

/**
 * VARIATION 2: a writing. Book when the corpus holds the saint's own words
 * in translation, CreativeWork about the saint when it holds a retelling.
 *
 * VARIATION 3 rides along inside it: every section carrying an explicit
 * citation becomes a Quotation in `hasPart`, with the saint as creator and
 * the citation preserved verbatim. Sections without a citation are never
 * emitted as quotations, because per the corpus's own convention those are
 * editorial voice, not the saint speaking.
 */
export function writingSchema(
  saint: Saint,
  work: Work,
  content: WritingContent,
): JsonLd {
  const url = abs(`/saints/${saint.slug}/${work.slug}`);
  const own = isOwnWords(content);
  const year = toIsoYear(work.year);

  const quotations = verbatimSections(content)
    .filter((s) => s.citation && s.paragraphs[0])
    .map((s) => ({
      "@type": "Quotation",
      "@id": `${url}#quote-${s.n}`,
      text: s.paragraphs[0],
      creator: { "@id": personId(saint.slug) },
      spokenByCharacter: saint.name,
      citation: s.citation,
      isPartOf: { "@id": `${url}#work` },
      inLanguage: "en",
    }));

  // Each section declares its own authorship. A machine reading this can
  // tell, per section, whether it is holding the saint's words, Scripture,
  // hymnography, or Purify's commentary. That distinction is the whole
  // point and it must survive into the structured data, not just the CSS.
  const sections = content.sections.map((s) => ({
    "@type": "CreativeWork",
    "@id": `${url}#section-${s.n}`,
    position: s.n,
    name: s.title,
    ...(s.citation ? { citation: s.citation } : {}),
    ...(s.voice === "editorial"
      ? {
          author: { "@type": "Organization", name: "Purify" },
          about: { "@id": personId(saint.slug) },
          creditText: "Editorial summary by Purify, not the saint's words",
        }
      : s.voice === "saint"
        ? { author: { "@id": personId(saint.slug) } }
        : { creditText: s.voice === "scripture" ? "Scripture" : "Liturgical text" }),
  }));

  return {
    "@context": "https://schema.org",
    "@type": own ? "Book" : "CreativeWork",
    "@id": `${url}#work`,
    url,
    name: content.title,
    ...(content.subtitle ? { alternativeHeadline: content.subtitle } : {}),
    description: work.blurb,
    inLanguage: "en",
    // The corpus is English translation of Greek or Latin originals. Saying
    // so is the difference between a machine treating this as the original
    // text and knowing it is a translation.
    translationOfWork: {
      "@type": "CreativeWork",
      name: content.title,
      inLanguage: saint.slug === "augustine-of-hippo" ? "la" : "grc",
    },
    ...(year ? { datePublished: year } : {}),
    ...(work.year ? { temporalCoverage: work.year } : {}),
    // Own words: the saint is the author. Retelling: the saint is the
    // subject and Purify is the author. Never both.
    ...(own
      ? { author: { "@id": personId(saint.slug) } }
      : {
          author: { "@type": "Organization", name: "Purify" },
          about: { "@id": personId(saint.slug) },
        }),
    // The translator, edition and public-domain provenance, verbatim.
    citation: content.source,
    sourceOrganization: { "@type": "Organization", name: "Purify" },
    isAccessibleForFree: true,
    license: "https://creativecommons.org/publicdomain/mark/1.0/",
    keywords: (work.topics ?? []).join(", "),
    isPartOf: { "@id": abs("/#website") },
    hasPart: [...sections, ...quotations],
    mainEntity: personSchema(saint),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Saints", item: abs("/saints") },
        { "@type": "ListItem", position: 2, name: saint.name, item: abs(`/saints/${saint.slug}`) },
        { "@type": "ListItem", position: 3, name: work.title, item: url },
      ],
    },
  };
}

/** Site-level identity, emitted once from the root layout. */
export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": abs("/#website"),
        url: SITE,
        name: "Purify",
        description:
          "Orthodox prayer, the liturgical calendar, Scripture, and the writings of the Church Fathers.",
        inLanguage: "en",
        publisher: { "@id": abs("/#org") },
      },
      {
        "@type": "Organization",
        "@id": abs("/#org"),
        name: "Purify",
        url: SITE,
        logo: abs("/icon.png"),
        description:
          "A digital treasury of Eastern Orthodox patristic writings, lives of the saints, and prayer.",
      },
    ],
  };
}
