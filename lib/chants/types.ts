/**
 * Chants (1.7): the shape of one chant, the same for every chant.
 *
 * The owner, 2026-10-16: the Kitchen goes and Chants takes its place, and
 * "every chant gets its own page in one format: what it is, where it comes
 * from, its variants" (notes 15 and 26). So a chant is one data file,
 * `data/chants/<slug>.json`, and adding a chant is adding files
 * (docs/chants/ADDING-A-CHANT.md): that file, its recordings and timed words
 * under `public/audio/chants/<slug>/`, its two catalog lines, and a row in
 * docs/licensing/audio-provenance.md.
 *
 * The words are the Church's published text, never a transcript (note 28):
 * a recording's transcript only gives each line its time, in a timing file
 * beside the recording. Prose here is written as canonically as it can be,
 * cited, and marked for a future clergy review (the owner's standing note of
 * 2026-10-16: no priest reviews Purify yet).
 *
 * Pure types and lists, no imports: the client reads the same shapes as the
 * registry (lib/chants/registry.server.ts) that builds them.
 */

/**
 * The chant traditions a reader browses by (the owner's answer of
 * 2026-10-16: "Russian chants, Greek chants, and so on"). "contemporary" is
 * for songs of our own time that belong to no service, the Prayer Rope
 * Anthem first; it shows among the traditions only when it has chants.
 */
export const CHANT_TRADITIONS = [
  "greek",
  "russian",
  "serbian",
  "antiochian",
  "romanian",
  "georgian",
  "contemporary",
] as const;
export type ChantTradition = (typeof CHANT_TRADITIONS)[number];

/** What kind of hymn it is, as the service books name them. */
export const CHANT_KINDS = [
  "troparion",
  "kontakion",
  "hymn",
  "psalm",
  "sticheron",
  "irmos",
  "megalynarion",
  "response",
] as const;
export type ChantKind = (typeof CHANT_KINDS)[number];

/**
 * One line of the words: the line as it is sung, then, under it, a
 * transliteration where the script is not Latin (ours, and labelled so) and
 * an English line.
 */
export type ChantLine = { text: string; translit?: string; en?: string };

/**
 * When in the year a chant is the Church's song of the day, so the home can
 * offer it then. `paschal` counts days from Pascha (0 is Pascha, -7 Palm
 * Sunday, 49 Pentecost); `fixed` is a span of the menologion, "MM-DD" to
 * "MM-DD", read on the reader's own calendar (an Old Calendar reader keeps
 * the feast thirteen days later by the civil date).
 */
export type ChantWindow = { paschal: [number, number] } | { fixed: [string, string] };

export type ChantWhen = {
  /** Sung at any time of the year. */
  anytime?: boolean;
  windows?: ChantWindow[];
  /** The services it belongs to, in English (shown on the page). */
  services?: string[];
};

/** A published source for the words or the history. Public domain only. */
export type ChantSource = {
  title: string;
  author?: string;
  year?: string;
  url?: string;
  /** What this source gives: "Greek text", "English, Hapgood 1906", ... */
  note?: string;
};

/** The English under the lines, and where it comes from. */
export type ChantTranslation = {
  /**
   * "parallel": the same song's English version, line for line (the Prayer
   * Rope Anthem). "public-domain": a published translation (Hapgood's
   * Service Book, Brenton for the Psalms). "ours": Purify's working
   * translation, awaiting a future clergy review.
   */
  kind: "parallel" | "public-domain" | "ours";
  title: string;
};

/** One recording of the chant, with its words. */
export type ChantVariant = {
  /** Unique within the chant, and the recording's file name. */
  id: string;
  /** BCP-47: "en", "el", "ar", "ru", "cu" for Church Slavonic, ... */
  language: string;
  /** The version's name in its own script: "English", "Ελληνικά". */
  label: string;
  tradition: ChantTradition;
  /** The setting or melody, when it is known: "Znamenny chant". */
  setting?: string;
  /** Who sings it, when known. Never invented: null says "not known". */
  performer: string | null;
  /**
   * The recording. Under /audio/chants/ it is on the website only and
   * streams to the apps (lib/chants/media.ts); any other path is in the
   * bundle.
   */
  audio: { src: string; durationSec: number };
  /** The timing file beside a streamed recording: each line's start and end. */
  timing?: string;
  /** The stretch a preview plays, in seconds: the part it is known by. */
  preview: { from: number; to: number };
  /** Offered by Pray with chant, to play under a prayer. */
  underPrayer?: boolean;
  /** Right to left (Arabic). */
  rtl?: boolean;
  lines: ChantLine[];
  /** Where these words come from, in English, said plainly. */
  wordsSource: string;
  translation?: ChantTranslation;
};

export type ChantReview = {
  status: "awaiting-clergy-review" | "reviewed";
  /** YYYY-MM-DD */
  since: string;
};

export type Chant = {
  slug: string;
  /** For its catalog lines: chants.item.<key>.title and .line. */
  key: string;
  /** English, letter for letter the English catalog's title. */
  title: string;
  /** The title in its own script, when it is not English. */
  originalTitle?: string;
  kind: ChantKind;
  /** The tone (1 to 8) it is sung in, when it has one. */
  tone?: number;
  /** A psalm's number, by the Septuagint as the Church counts them. */
  psalm?: number;
  when: ChantWhen;
  /** What it is, where it comes from, when it is sung: English prose. */
  about: { what: string; history: string; when: string };
  /** Catalog keys for parts of `about` that are translated; they win. */
  aboutKeys?: { what?: string; history?: string; when?: string };
  sources: ChantSource[];
  review: ChantReview;
  /** Other chants' slugs, shown under it while they are live. */
  related?: string[];
  /** A public-domain icon for its cover. With none, the plain plate. */
  cover?: { src: string; alt: string; credit: string };
  /** "hidden" keeps the file out of every list and page. */
  status: "live" | "hidden";
  /** YYYY-MM-DD: the newest is offered first when nothing else is due. */
  addedOn: string;
  variants: ChantVariant[];
};

/** A timing file: the read-aloud's shape (lines with a start and an end). */
export type ChantTiming = {
  v: 1;
  durationSec: number;
  /** Line for line the variant's words; the text is checked against them. */
  lines: { at: number; end: number; text: string }[];
};

/** What a list needs of a recording: no words. */
export type ChantIndexVariant = Omit<ChantVariant, "lines" | "wordsSource" | "translation">;

/**
 * A chant as the home, the search and Pray with chant list it: everything
 * but the words and the prose, so a list stays small.
 */
export type ChantIndexRow = {
  slug: string;
  key: string;
  title: string;
  originalTitle?: string;
  kind: ChantKind;
  tone?: number;
  psalm?: number;
  when: ChantWhen;
  cover?: Chant["cover"];
  addedOn: string;
  /** Its variants' traditions, each once, in order. */
  traditions: ChantTradition[];
  /** The shortest recording, in seconds. */
  shortest: number;
  variants: ChantIndexVariant[];
};
