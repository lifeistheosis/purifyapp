// The Bible translations a chapter can be read in, and which of them a given
// chapter offers. One list for the phone's sheet (MobileTranslationPill) and
// the computer's popover (TranslationSwitcher), so the two cannot drift.
//
// Pure: no React, no window. The choice itself (the ?v= in the address and
// the remembered pick) is made in components/bible/TranslationList.tsx.

export type TranslationTestament = "OT" | "NT" | "BOTH";

export type Translation = {
  id: string;
  /** What the pill shows: "KJV", "Brenton LXX". */
  shortLabel: string;
  /** The edition's own title, kept as written: a proper name, not copy. */
  fullLabel: string;
  testament: TranslationTestament;
  /** Its text is in the app (or, when licensed, can be fetched). */
  available: boolean;
  /** Licensed (API.Bible): selected with ?v= and fetched live. */
  licensed?: boolean;
  /**
   * The language of the text, as a BCP 47 code. Every row is English today;
   * the Greek, Romanian and Filipino Bibles of 1.7 add rows in their own
   * languages, and the sheet groups rows by this.
   */
  language: string;
};

// Single canonical list of translations the app cares about. A new
// translation is added here once its text is licensed or ingested, with its
// note under bible.translationNote.<id> in the catalogs.
export const TRANSLATIONS: readonly Translation[] = [
  {
    id: "lxx-brenton",
    shortLabel: "Brenton LXX",
    fullLabel: "Brenton's English Septuagint (1851)",
    testament: "OT",
    available: true,
    language: "en",
  },
  {
    id: "kjv",
    shortLabel: "KJV",
    fullLabel: "King James Version (1611)",
    testament: "NT",
    available: true,
    language: "en",
  },
  {
    id: "web",
    shortLabel: "WEB",
    fullLabel: "World English Bible",
    testament: "BOTH",
    available: false,
    language: "en",
  },
  {
    id: "nkjv",
    shortLabel: "NKJV",
    fullLabel: "New King James Version",
    testament: "NT",
    available: true,
    licensed: true,
    language: "en",
  },
  {
    id: "niv",
    shortLabel: "NIV",
    fullLabel: "New International Version",
    testament: "NT",
    available: true,
    licensed: true,
    language: "en",
  },
  {
    id: "nlt",
    shortLabel: "NLT",
    fullLabel: "New Living Translation",
    testament: "NT",
    available: true,
    licensed: true,
    language: "en",
  },
];

/** What decides the list for a chapter: its book, and what is set up. */
export type TranslationScope = {
  testament: "OT" | "NT";
  /** The book's text source (data/bible/books.json): "kjv-pd", "brenton-lxx-pd". */
  source?: string;
  /** Licensed translation ids whose API access is configured. */
  configured: readonly string[];
};

const KJV = TRANSLATIONS.find((t) => t.id === "kjv") ?? TRANSLATIONS[0];

/**
 * An Old Testament book carried in the KJV is read in the KJV and offers
 * nothing else: 2 Esdras is not in the Greek Old Testament, so Brenton has no
 * text of it (scripts/ingest-2-esdras.mjs). Without this the pill named
 * "Brenton LXX" over the KJV's words.
 */
function kjvOnly({ testament, source }: TranslationScope): boolean {
  return testament === "OT" && source === "kjv-pd";
}

/** The public-domain default for a testament, read when no licensed ?v= is set. */
function publicDomainDefault(testament: "OT" | "NT"): Translation {
  return (
    TRANSLATIONS.find((t) => t.available && !t.licensed && (t.testament === testament || t.testament === "BOTH")) ??
    TRANSLATIONS[0]
  );
}

/** A row a reader can pick: its text exists, and a licensed one is set up. */
export function isSelectable(t: Translation, configured: readonly string[]): boolean {
  return t.available && (!t.licensed || configured.includes(t.id));
}

/**
 * The translations a chapter lists, in the list's order. A licensed one that
 * is not set up is not listed at all: they are switched off while the
 * API.Bible licence is upgraded (lib/bible/api-bible.ts), and a greyed row
 * saying "Requires setup" only told readers about our plumbing. One that is
 * not in the app yet (the WEB) is listed, and cannot be picked.
 */
export function translationsFor(scope: TranslationScope): Translation[] {
  if (kjvOnly(scope)) return [KJV];
  return TRANSLATIONS.filter(
    (t) =>
      (t.testament === scope.testament || t.testament === "BOTH") &&
      (!t.licensed || scope.configured.includes(t.id)),
  );
}

/**
 * The translation the chapter is being read in. A licensed one is current
 * only when its ?v= is set, it is set up, and it belongs to this testament
 * (the licensed ones are New Testament only here). Otherwise it is the
 * public-domain text of the testament, or the KJV for a KJV-only book.
 */
export function currentTranslation(scope: TranslationScope & { activeV: string | null }): Translation {
  const licensed = TRANSLATIONS.find(
    (t) => t.licensed && t.id === scope.activeV && t.testament === scope.testament && scope.configured.includes(t.id),
  );
  if (licensed) return licensed;
  return kjvOnly(scope) ? KJV : publicDomainDefault(scope.testament);
}

/**
 * The address's query once a translation is chosen: a licensed one is named
 * in ?v=, a public-domain one clears it. Everything else in the query stays.
 */
export function queryFor(t: Translation, query: string): string {
  const params = new URLSearchParams(query);
  if (t.licensed) params.set("v", t.id);
  else params.delete("v");
  return params.toString();
}

/** Rows grouped by language, in the order each language first appears. */
export function byLanguage(list: readonly Translation[]): { language: string; rows: Translation[] }[] {
  const groups: { language: string; rows: Translation[] }[] = [];
  for (const t of list) {
    const group = groups.find((g) => g.language === t.language);
    if (group) group.rows.push(t);
    else groups.push({ language: t.language, rows: [t] });
  }
  return groups;
}
