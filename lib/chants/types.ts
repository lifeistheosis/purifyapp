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

/**
 * Where the recordings added from 1.8 on are kept: Purify's own bucket on
 * Cloudflare R2, at audio.purifyapp.net, as the Bible read aloud is
 * (lib/readAloud/chapters.ts). The owner's word of 2026-10-30, "R2, like the
 * Bible audio": out of the public repository, the same address on the
 * website and in the apps. A recording there is `<this><slug>/<id>.mp3`;
 * its timing file rides in the app (CHANT_TIMING).
 */
export const CHANT_RECORDINGS = "https://audio.purifyapp.net/chants/";

/**
 * Where a version's timing file is read (1.8, build 86 note 78): beside the
 * page, in the apps' bundle and on the website alike, at
 * `<this><slug>/<id>.json`. The file is `data/chants/timing/<slug>/<id>.json`,
 * written out by app/chant-timing at build time, so a build always carries
 * the timing of the words it shows. Through build 86 the apps asked the
 * website for it, and the website still ran 1.8 as launched: Psalm 135 and
 * Psalm 117 were not timed on the owner's phone ("So the chats they're not
 * timed"). The recordings still stream.
 */
export const CHANT_TIMING = "/chant-timing/";

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
   * The recording. In Purify's bucket (CHANT_RECORDINGS, every recording
   * since 1.8) or under /audio/chants/ (the Prayer Rope Anthem's, from 1.7)
   * it streams, on the website and in the apps (lib/chants/media.ts); any
   * other path is in the bundle.
   */
  audio: { src: string; durationSec: number };
  /**
   * The recording's timing file, in the bundle (CHANT_TIMING): each line's
   * start and end. A recording with none has its words without Sing along.
   */
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

/** One sung word's time (a version 2 timing file): when it starts and when it ends, in seconds. */
export type ChantWordTime = [at: number, end: number];

/** One line of a timing file. */
export type ChantTimingLine = {
  at: number;
  end: number;
  text: string;
  /**
   * Version 2: each word's start and end, word for word the line's words as
   * spaces split them (lib/player/captions.ts, wordsOf). The first starts
   * with the line.
   */
  words?: ChantWordTime[];
  /**
   * Version 2: the words, by place from 0, that the speech model's own
   * hearing did not find, so their times rest on the alignment alone. A line
   * with most of its words here is one to hear again by ear.
   */
  unheard?: number[];
};

/**
 * A timing file: the read-aloud's shape (lines with a start and an end).
 * Version 1 times the lines (through build 86); version 2 (1.8, build 86
 * note 78, the owner's "each word timestamped and followed in the lyrics
 * section") times each word too, made by scripts/chants/time-words.mjs.
 * Both are read.
 */
export type ChantTiming = {
  v: 1 | 2;
  durationSec: number;
  /** Version 2: how the word times were made, and when (YYYY-MM-DD). */
  made?: { by: string; on: string };
  /** Line for line the variant's words; the text is checked against them. */
  lines: ChantTimingLine[];
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
