/**
 * A drop: everything that tells people a release exists.
 *
 * The release ritual (docs/RELEASE.md) ends at a pushed, built, checked
 * release. It said almost nothing about what happens next, and 1.5 shows what
 * that cost: the website carried 1.5 for a day and then 1.5.2, while What's
 * New still showed the 1.4 note, no announcement had been posted, no email
 * had gone and no card had been made. The work was finished and nobody had
 * been told.
 *
 * So a drop is a file, docs/plans/v<release>/drop.json, and this module is
 * what reads it. The file holds the release's story once (its points, each
 * tied to the line of the note that says it) and then every piece that goes
 * out: the stores' texts, the Discord posts, the letter, the notification,
 * the captions, and the steps between them. docs/DROP.md is the prose.
 *
 * THE RULE THIS FILE EXISTS FOR: a drop says only what the notes say. A
 * point names the note line it comes from, and the check looks that line up.
 * Edit the note and the drop fails until it agrees again.
 *
 * Nothing here sends anything. The owner sends; a piece records that he did.
 *
 * Types and the table of places only. The rules are in ./check.ts, the first
 * drafts in ./compose.ts, the page the owner works from in ./page.ts.
 */

/** When a piece goes out. In order: nothing later goes before something earlier is done. */
export const MOMENTS = ["ready", "submit", "web", "stores", "after", "numbers"] as const;
export type Moment = (typeof MOMENTS)[number];

export const MOMENT_LABEL: Readonly<Record<Moment, { name: string; when: string }>> = {
  ready: { name: "Before anything goes out", when: "First, so every link leads to the right note" },
  submit: { name: "With the store submissions", when: "When the builds are handed to Apple and Google" },
  web: { name: "The announcement", when: "The day you tell people, once the note is showing on the website" },
  stores: { name: "The day a store has it", when: "Each store on its own day, when it shows the version" },
  after: { name: "A few days later", when: "Once most phones have updated" },
  numbers: { name: "A week later: the numbers", when: "Once the release has had its first week" },
};

export type ChannelId =
  | "step"
  | "note"
  | "notes-all"
  | "board"
  | "play"
  | "appstore"
  | "appstore-promo"
  | "appstore-description"
  | "email"
  | "letter"
  | "push"
  | "discord"
  | "community"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "cards"
  | "video"
  | "sql";

/** A place a piece goes, and what that place holds and refuses. */
export type Channel = {
  name: string;
  /** One mark, so the page can be scanned. */
  icon: string;
  /** Where the owner pastes it or does it. */
  where: string;
  /** True when the text is copied from the kit and pasted somewhere. */
  paste: boolean;
  /**
   * Its words are written out each time the kit is made, from the notes or
   * from code, and never kept in drop.json, so they cannot fall behind what
   * they are made from.
   */
  writtenOut?: boolean;
  /** The owner runs it himself and nothing goes out: it is done, not sent. */
  runs?: boolean;
  /** Characters the place holds. */
  limit?: number;
  /**
   * Every language is pasted at once, each between its own tags
   * (<en-US> ... </en-US>), and the limit holds each language on its own:
   * Google Play's release notes. A text with no tags is one language.
   */
  languages?: boolean;
  /** Characters its title line holds (a notification, a post, a letter's subject). */
  subjectLimit?: number;
  /** Characters its first line holds (a YouTube title). */
  firstLine?: number;
  emoji: boolean;
  links: boolean;
  /**
   * False where a post carries no ** bold: Discord, by the owner's rule
   * (2026-10-17, the 1.7 announcement), and Purify's own post in Community,
   * which shows the asterisks as they are typed.
   */
  bold?: boolean;
  /** At most this many hashtags. */
  hashtags?: number;
  /** A line break ends the input (Instagram on the web). */
  oneParagraph?: boolean;
  /** Digits are held to the drop's own list of figures: no number that ages. */
  figures?: boolean;
  /** Words this place refuses, such as the other store's name. */
  forbid?: string[];
};

const OTHER_THAN_APPLE = ["android", "google play", "play store", "google"];
const OTHER_THAN_GOOGLE = ["iphone", "ipad", "ios", "app store", "apple", "testflight"];

export const CHANNELS: Readonly<Record<ChannelId, Channel>> = {
  step: { name: "A step", icon: "✅", where: "", paste: false, emoji: true, links: true },
  note: {
    name: "The note in the app",
    icon: "📝",
    where: "Admin, Patch notes",
    paste: false,
    emoji: true,
    links: true,
  },
  "notes-all": {
    name: "Every line of the release, in one note",
    icon: "🗒️",
    where: "Wherever the whole list is wanted",
    paste: true,
    writtenOut: true,
    emoji: true,
    links: true,
  },
  board: {
    name: "The weekly board",
    icon: "📌",
    where: "Admin, Patch notes, the board message",
    paste: true,
    limit: 900,
    subjectLimit: 60,
    emoji: true,
    links: false,
  },
  // Each store refuses the other's name in its own listing, and a rejection
  // for it costs a day of review. Google Play's notes take every language at
  // once, each in its own tags and each held to 500 characters, and they may
  // carry emoji: the owner's 1.7 notes, in 21 languages, lead each line with
  // one (2026-10-17). The App Store's texts carry none.
  play: {
    name: "Google Play, What's new",
    icon: "🤖",
    where: "Play Console, the release, Release notes",
    paste: true,
    limit: 500,
    languages: true,
    emoji: true,
    links: false,
    forbid: OTHER_THAN_GOOGLE,
  },
  appstore: {
    name: "App Store, What's New in This Version",
    icon: "🍎",
    where: "App Store Connect, the version, What's New in This Version",
    paste: true,
    limit: 4000,
    emoji: false,
    links: false,
    forbid: OTHER_THAN_APPLE,
  },
  "appstore-promo": {
    name: "App Store, promotional text",
    icon: "🍎",
    where: "App Store Connect, the version, Promotional Text",
    paste: true,
    limit: 170,
    emoji: false,
    links: false,
    forbid: OTHER_THAN_APPLE,
  },
  // The listing itself, sent with a version when it changes (1.7). It ends on
  // the Terms of Use and the Privacy Policy, which App Review looks for in an
  // app that sells a subscription, so it may carry a link: one to read, since
  // it cannot be tapped there.
  "appstore-description": {
    name: "App Store, description",
    icon: "🍎",
    where: "App Store Connect, the version, Description",
    paste: true,
    limit: 4000,
    emoji: false,
    links: true,
    forbid: OTHER_THAN_APPLE,
  },
  email: {
    name: "The release email",
    icon: "✉️",
    where: "Admin, Email, the release email",
    paste: false,
    emoji: true,
    links: true,
  },
  letter: {
    name: "A letter from your own mail",
    icon: "💌",
    where: "Your own mail, one address at a time or in BCC",
    paste: true,
    subjectLimit: 80,
    emoji: false,
    links: true,
  },
  // lib/push/doctrine.ts holds the real rules, and the check runs them. The
  // two limits here are the admin route's own.
  push: {
    name: "A notification",
    icon: "🔔",
    where: "Admin, Push",
    paste: true,
    limit: 300,
    subjectLimit: 80,
    emoji: false,
    links: false,
  },
  discord: {
    name: "Discord",
    icon: "💬",
    where: "Discord, #announcements",
    paste: true,
    limit: 2000,
    emoji: true,
    links: true,
    bold: false,
  },
  community: {
    name: "Purify's own post in Community",
    icon: "🕯️",
    where: "Community, signed in as Purify",
    paste: true,
    limit: 4000,
    subjectLimit: 160,
    emoji: true,
    links: true,
    bold: false,
  },
  // The three captions follow purify-ads/ssm/GUARDRAILS.md, G3.5 and G1.6.
  instagram: {
    name: "Instagram caption",
    icon: "📸",
    where: "Instagram, the caption",
    paste: true,
    limit: 2200,
    emoji: false,
    links: false,
    hashtags: 5,
    oneParagraph: true,
    figures: true,
  },
  tiktok: {
    name: "TikTok caption",
    icon: "🎵",
    where: "TikTok, the caption",
    paste: true,
    limit: 2200,
    emoji: false,
    links: false,
    hashtags: 5,
    figures: true,
  },
  youtube: {
    name: "YouTube title and hashtags",
    icon: "▶️",
    where: "YouTube, the title, then the description",
    paste: true,
    limit: 2200,
    firstLine: 100,
    emoji: false,
    links: false,
    hashtags: 5,
    figures: true,
  },
  cards: {
    name: "The cards",
    icon: "🖼️",
    where: "Instagram and TikTok, from the files",
    paste: false,
    emoji: false,
    links: false,
  },
  video: {
    name: "The video",
    icon: "🎬",
    where: "TikTok, Reels or Shorts, from the file",
    paste: false,
    emoji: false,
    links: false,
  },
  // Read-only SQL for the release's first week, run by the owner in Supabase.
  // Its words are lib/drop/numbers.ts, written out for the drop's own week.
  sql: {
    name: "Read-only SQL",
    icon: "📊",
    where: "Supabase, the SQL editor",
    paste: true,
    writtenOut: true,
    runs: true,
    emoji: false,
    links: true,
  },
};

/** One thing the release brought, said once and used everywhere. */
export type Point = {
  id: string;
  emoji: string;
  /** Without its full stop: the layout that shows it adds one. */
  name: string;
  /** One or two sentences, ending in a full stop. */
  text: string;
  /** A handful of words, for a store's list and anywhere short. No full stop. */
  short: string;
  /** Where the notes say it: the version, and words that note carries letter for letter. */
  from: { version: string; has: string }[];
  /** True only inside a store build: the website does not have it. */
  needs?: "apps";
  /** It is one of the release email's points (lib/whatsNew/releaseEmail.ts). */
  email?: boolean;
};

export type Sent = {
  /** The day, as 2026-10-05. */
  on: string;
  /** Who sent it. A piece sent for the owner carries his words. */
  by: string;
  words?: string;
  link?: string;
  /**
   * Set when the owner sent it ahead of its moment, before a store had the
   * build it describes: what that means for the reader, in a line. The order
   * is his to break, and a record that hid it would be worse than the break.
   * It needs his words, and every check after it still says so, as a warning.
   */
  early?: string;
};

export type Piece = {
  id: string;
  channel: ChannelId;
  moment: Moment;
  /** What it is, to a person. */
  title: string;
  /** Where it goes, when the channel's own answer is not exact enough. */
  where?: string;
  /** A title line of its own: a notification's title, a post's, a letter's subject. */
  subject?: string;
  /** What is pasted. For a step, what is done. */
  text?: string;
  /** One thing to know before it goes. */
  note?: string;
  /** Who does it. "us" is done here, on the owner's word. */
  who?: "owner" | "us";
  /** For a store's own post: which store. */
  store?: "android" | "ios";
  /** The stores a step is done in, when it belongs to no one store: the submission hands a build to each. */
  stores?: ("android" | "ios")[];
  /** The piece in purify-ads/ssm that holds the files (cards, a video). */
  madeIn?: string;
  /** What it is still waiting for, in a line. A piece that waits is never sent. */
  waits?: string;
  sent?: Sent | null;
};

/** The list a build is walked by on a real phone before it goes to its store. */
export const PHONE_WALK = "docs/PHONE-WALK.md";

/** The phone each store's build is walked on, as a sentence names it. */
export const PHONE_NAME: Readonly<Record<"android" | "ios", string>> = { android: "an Android phone", ios: "an iPhone" };

/**
 * A build walked on a real phone before it goes to its store, from the list
 * in docs/PHONE-WALK.md. Recorded on the owner's word, with his words: what
 * a browser cannot show (the logo screen lifting, the back button, the soft
 * tick, the widget) is only ever seen in a hand.
 */
export type PhoneWalk = {
  /** The day, as 2026-10-05. */
  on: string;
  words: string;
  /** The build that was walked, when he said which. */
  build?: number;
};

/**
 * The first week's numbers as the owner read them out, from the SQL of the
 * last moment (lib/drop/numbers.ts). His words are the record: the numbers
 * are his to read, and the database is never read from here.
 */
export type Readout = {
  /** The day, as 2026-10-05. */
  on: string;
  words: string;
  /** Read out ahead of the store day, on his word: what that means. As Sent.early. */
  early?: string;
};

export type NoteState = "written" | "queued" | "accepted";

export type Drop = {
  /** The release as people know it: "1.5". */
  release: string;
  /** The build that carries it: "1.5.2". */
  version: string;
  /** Every note the drop speaks for, oldest first. */
  covers: string[];
  /** The release's name, as its note has it. */
  name: string;
  /** One sentence that says what the release is. */
  line: string;
  /** The sentence every long piece ends on. */
  closing: string;
  /**
   * The drop day: the day the announcement goes out, as 2026-11-12, and the
   * day every other moment is counted from (MOMENT_DUE in ./days.ts). Null
   * until the owner picks one, often against the Church's year:
   * `node scripts/drop.mjs days` lists the next occasions.
   */
  day?: string | null;
  /** What the day is for, when it is planned against one: "The Nativity Fast begins". */
  occasion?: string | null;
  links: { whatsNew: string; appStore: string; play: string };
  hashtags: string[];
  /** Where each note stands. Nothing after "ready" goes out until the release's own note is accepted. */
  notes: { version: string; state: NoteState; revision?: string; on?: string }[];
  /** The store builds: their numbers, and the day each store began to serve one. */
  builds: {
    android: { build: number; made?: string; served?: string | null };
    ios: { build: number; made?: string; served?: string | null };
  };
  /** Each platform's walk on a real phone. Nothing goes to a store before its own is recorded. */
  phone?: { android: PhoneWalk | null; ios: PhoneWalk | null };
  /** What may not be said, and why: switched off, not built, or not seen working. */
  never: { word: string; why: string }[];
  /** The numbers a caption or a card may carry, each with where it comes from. */
  figures: { figure: string; source: string }[];
  points: Point[];
  /** Smaller things worth a line where there is room. Each tied to a note, like a point. */
  also: { text: string; from: { version: string; has: string } }[];
  pieces: Piece[];
  /** The first week's numbers, each time the owner read them out. */
  numbers?: Readout[];
};

/** The release a version belongs to: "1.5.2" is a patch of "1.5". As lib/whatsNew/version.ts. */
export function releaseOf(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

/** How long a text is where it is pasted: a character a person would count, not a UTF-16 unit. */
export function length(text: string): number {
  return [...text].length;
}

/** One language's tag in Google Play's notes: en-US, el-GR, fil, ro. */
const LANGUAGE_TAGGED = /<([a-z]{2,3}(?:-[A-Z]{2})?)>\r?\n?([\s\S]*?)\r?\n?<\/\1>/g;

/**
 * A text written for every language at once, as its languages, in order: the
 * tag and the words between it and its closing tag. Null when the text has no
 * tags, so it is one language.
 */
export function languagesOf(text: string): { tag: string; text: string }[] | null {
  const found = [...text.matchAll(LANGUAGE_TAGGED)].map((m) => ({ tag: m[1], text: m[2] }));
  return found.length ? found : null;
}

/**
 * What a place counts against its limit. Where each language is its own text
 * (Google Play), that is the longest language; anywhere else, the whole text.
 */
export function measured(channel: Channel, text: string): { count: number; languages: number } {
  const each = channel.languages ? languagesOf(text) : null;
  if (!each) return { count: length(text), languages: 1 };
  return { count: Math.max(...each.map((l) => length(l.text))), languages: each.length };
}

/** What is pasted for a piece: its title line, a blank line, its text. */
export function pasted(piece: Piece): string {
  return [piece.subject, piece.text].filter((part): part is string => Boolean(part)).join("\n\n");
}

/**
 * True when a piece's words are written in the drop itself. The whole note
 * and the week's SQL are pasted too, and written nowhere: ./compose.ts sets
 * the note out from the notes each time, and ./numbers.ts the SQL from the
 * drop's own week, so neither can fall behind what it is made from.
 */
export function hasOwnWords(piece: Piece): boolean {
  const channel = CHANNELS[piece.channel];
  return channel.paste && !channel.writtenOut;
}

/** A piece is ready to send when it has its words (or its files) and waits on nothing. */
export function pieceState(piece: Piece): "sent" | "waits" | "ready" | "empty" {
  if (piece.sent) return "sent";
  if (piece.waits) return "waits";
  if (hasOwnWords(piece) && !piece.text) return "empty";
  return "ready";
}

/**
 * The stores a piece is handed to. Google Play's text goes to the Android
 * store and the App Store's texts to Apple's, by their place; any other
 * piece says so with `store`, or with `stores` for a step done in both.
 */
export function storesOf(piece: Piece): ("android" | "ios")[] {
  const to = new Set(piece.stores ?? []);
  if (piece.store) to.add(piece.store);
  if (piece.channel === "play") to.add("android");
  if (piece.channel === "appstore" || piece.channel === "appstore-promo" || piece.channel === "appstore-description") to.add("ios");
  return (["android", "ios"] as const).filter((store) => to.has(store));
}

/**
 * True once anything of a moment has gone out. A moment is under way from its
 * first piece: one the owner chose not to send must not hold it open forever.
 */
export function wentOut(drop: Pick<Drop, "pieces">, moment: Moment): boolean {
  return drop.pieces.some((p) => p.moment === moment && Boolean(p.sent));
}
