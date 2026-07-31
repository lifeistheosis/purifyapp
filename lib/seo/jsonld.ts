// Structured data for saints and their writings.
//
// The one rule that matters here: ATTRIBUTION FOLLOWS `voice`. A work whose
// sections are the saint's own words is a Book he wrote. A work that mixes
// in Purify's retelling, or the Church's hymns to him, or another author
// narrating his life, is NOT. Emitting `author: <saint>` over Purify's prose
// would publish a false authorship claim in a machine-readable format, which
// is the one kind of error nothing ever corrects: it is scraped, trained on,
// and repeated.
//
// So: any editorial section demotes the whole work to a CreativeWork authored
// by Purify and `about` the saint. A work with no editorial sections but with
// liturgical or witness ones is `about` him too, with the saint credited only
// where he actually wrote.
//
// Deliberately conservative about `author`. An unlabelled section could be
// anyone's, so a work containing unlabelled sections never claims the saint
// as author on their strength alone.

import type { Saint } from "@/lib/saints/saints";
import type { SectionVoice, WritingContent } from "@/lib/saints/load";
import { SITE_URL } from "@/lib/site";

const PUBLISHER = {
  "@type": "Organization",
  name: "Purify",
  url: SITE_URL,
} as const;

export type JsonLd = Record<string, unknown>;

/** Person + ProfilePage for a saint. `sameAs` is passed in, never guessed. */
export function saintJsonLd(saint: Saint, sameAs?: string[]): JsonLd {
  const person: JsonLd = {
    "@type": "Person",
    name: saint.name,
    url: `${SITE_URL}/saints/${saint.slug}`,
    ...(saint.epithet ? { description: saint.epithet } : {}),
    ...(saint.born ? { birthDate: saint.born } : {}),
    ...(saint.reposed ? { deathDate: saint.reposed } : {}),
    ...(saint.iconUrl ? { image: `${SITE_URL}${saint.iconUrl}` } : {}),
    // Only when resolved through the live authority APIs. A guessed QID
    // points search engines at a different person and fails silently.
    ...(sameAs?.length ? { sameAs } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: person,
    publisher: PUBLISHER,
  };
}

/** Voices that mean "the saint did not write this part". */
const NOT_HIS: SectionVoice[] = ["editorial", "liturgical", "witness", "scripture"];

export function workAuthorship(content: WritingContent): {
  type: "Book" | "CreativeWork";
  byPurify: boolean;
  reason: string;
} {
  const voices = content.sections.map((s) => s.voice);
  const hasEditorial = voices.includes("editorial");
  const hasOtherHand = voices.some((v) => v && NOT_HIS.includes(v));
  const allSaint = voices.length > 0 && voices.every((v) => v === "saint");

  if (hasEditorial) {
    return {
      type: "CreativeWork",
      byPurify: true,
      reason: "contains Purify's own prose",
    };
  }
  if (allSaint) {
    return { type: "Book", byPurify: false, reason: "every section is his own words" };
  }
  if (hasOtherHand) {
    return {
      type: "CreativeWork",
      byPurify: false,
      reason: "contains verbatim text he did not write",
    };
  }
  // Nothing classified. Claim nothing.
  return {
    type: "CreativeWork",
    byPurify: false,
    reason: "sections not yet attributed",
  };
}

/**
 * A writing. `content.source` is the edition and translator line, carried
 * verbatim into `citation` so a machine can tell it is reading a translation
 * and which one.
 */
export function writingJsonLd(saint: Saint, content: WritingContent): JsonLd {
  const { type, byPurify } = workAuthorship(content);
  const url = `${SITE_URL}/saints/${saint.slug}/${content.slug}`;

  const base: JsonLd = {
    "@context": "https://schema.org",
    "@type": type,
    name: content.title,
    url,
    ...(content.subtitle ? { description: content.subtitle } : {}),
    inLanguage: "en",
    citation: content.source,
    publisher: PUBLISHER,
    isPartOf: {
      "@type": "Collection",
      name: "The Fathers on Purify",
      url: `${SITE_URL}/saints`,
    },
  };

  if (type === "Book" && !byPurify) {
    base.author = { "@type": "Person", name: saint.name, url: `${SITE_URL}/saints/${saint.slug}` };
  } else {
    // Not his book. Say who made the page, and who it concerns.
    if (byPurify) base.author = PUBLISHER;
    base.about = {
      "@type": "Person",
      name: saint.name,
      url: `${SITE_URL}/saints/${saint.slug}`,
    };
  }

  // Only when the corpus actually declares it. Inferring a source language
  // from a saint's name is the same class of guess this module exists to
  // avoid.
  if (content.originalLanguage) {
    base.translationOfWork = {
      "@type": "CreativeWork",
      inLanguage: content.originalLanguage,
      ...(content.originalTitle ? { name: content.originalTitle } : {}),
    };
  }

  // Sections that are verbatim quotations of someone, surfaced so a machine
  // reading the page knows which parts are quoted and from whom.
  const quotations = content.sections
    .filter((s) => s.voice === "scripture" || s.voice === "liturgical" || s.voice === "witness")
    .map((s) => ({
      "@type": "Quotation",
      name: s.title,
      ...(s.citation ? { citation: s.citation } : {}),
      ...(s.voiceAuthor
        ? { spokenByCharacter: { "@type": "Person", name: s.voiceAuthor } }
        : {}),
      isPartOf: { "@type": "CreativeWork", name: content.title, url },
    }));
  if (quotations.length) base.hasPart = quotations;

  return base;
}
