/**
 * Section photography registry.
 *
 * The mobile shells were built out of SVG glyphs on grey gradients. This is
 * the photographic layer: one rights-verified image per section, used as a
 * masthead behind the section's title.
 *
 * Every entry carries the same rights fields the history media registry
 * requires (`lib/history/events.ts`), and for the same reason: an image ships
 * only if its source and license are documented. `scripts/fetch-section-media.mjs`
 * populates these files and will only accept a public-domain family license
 * (PD / PD-Art / PD-old / CC0) from Wikimedia Commons; the provenance is
 * mirrored to `docs/licensing/SECTION_MEDIA.md`.
 *
 * `lib/media/__tests__/sections.test.ts` fails the build if any entry is
 * missing a rights field, so this cannot rot the way `public/saints/icons/`
 * did (see `docs/licensing/icon-provenance.md`).
 */

export type SectionKey =
  | "today"
  | "bible"
  | "prayers"
  | "discover"
  | "reading"
  | "you";

export type SectionMedia = {
  /** Bundled path under /sections/. */
  src: string;
  /** Describes the picture, not the section. Checked against the image. */
  alt: string;
  /** The work depicted. */
  work: string;
  artist: string;
  /** When the work was made, e.g. "1546" or "14th century". */
  workDate: string;
  source: string;
  license: string;
  /** Where the license was verified. */
  evidenceUrl: string;
  /** Vertical focal point for object-position, e.g. "center" or "top". */
  focus?: "top" | "center" | "bottom";
};

/**
 * Populated by scripts/fetch-section-media.mjs. An absent section simply
 * renders its existing glyph masthead, so this can be filled in one section
 * at a time without breaking anything.
 */
export const SECTION_MEDIA: Partial<Record<SectionKey, SectionMedia>> = {
  // NOTE: `today` is deliberately absent. Today already carries the right
  // photograph for its surface, the icon of the day's commemorated saint
  // (components/today/TodaySaintCard.tsx), and its verse hero is a designed
  // night-sky card that a mosaic backdrop would fight. A generic Pantocrator
  // plate there would be decoration competing with content.
  bible: {
    src: "/sections/bible.jpg",
    alt: "A page of the Codex Sinaiticus, the Gospel of Matthew in Greek uncial script.",
    work: "Codex Sinaiticus, Matthew 6:4-32",
    artist: "Anonymous",
    workDate: "4th century",
    source: "File:Codex Sinaiticus Matthew 6,4-32.JPG",
    license: "Public domain",
    evidenceUrl:
      "https://commons.wikimedia.org/wiki/File%3ACodex_Sinaiticus_Matthew_6%2C4-32.JPG",
  },
  prayers: {
    src: "/sections/prayers.jpg",
    alt: "The face of Christ from the Deesis mosaic of Hagia Sophia, the icon of intercession.",
    work: "The Deesis mosaic, Hagia Sophia",
    artist: "Anonymous (photograph by Gryffindor)",
    workDate: "13th century",
    source: "File:Hagia Sophia Deesis mosaic.JPG",
    license: "Public domain",
    evidenceUrl:
      "https://commons.wikimedia.org/wiki/File%3AHagia_Sophia_Deesis_mosaic.JPG",
  },
  discover: {
    src: "/sections/discover.jpg",
    alt: "A miniature from the Menologion of Basil II on a gold ground: the Theotokos and Joseph bringing the Child to the temple.",
    work: "Menologion of Basil II, the Circumcision of Christ (f. 287)",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "c. 985",
    source: "File:Menologion of Basil 047.jpg",
    license: "Public domain",
    evidenceUrl:
      "https://commons.wikimedia.org/wiki/File%3AMenologion_of_Basil_047.jpg",
  },
  reading: {
    src: "/sections/reading.jpg",
    alt: "The Evangelist Luke at his writing desk with scroll, inkwell and pens, from the Ostromir Gospels.",
    work: "Ostromir Gospels, the Evangelist Luke",
    artist: "Anonymous",
    workDate: "1056",
    source: "File:Ostromir luke.jpg",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File%3AOstromir_luke.jpg",
  },
  you: {
    src: "/sections/you.jpg",
    alt: "The Ladder of Divine Ascent: monks climbing a ladder toward Christ, with angels above.",
    work: "The Ladder of Divine Ascent, St Catherine's Monastery, Sinai",
    artist: "Anonymous (photograph by Florian Prischl)",
    workDate: "12th century",
    source: "File:The Ladder of Divine Ascent.jpg",
    license: "Public domain",
    evidenceUrl:
      "https://commons.wikimedia.org/wiki/File%3AThe_Ladder_of_Divine_Ascent.jpg",
  },
};

export function sectionMedia(key: SectionKey): SectionMedia | null {
  return SECTION_MEDIA[key] ?? null;
}
