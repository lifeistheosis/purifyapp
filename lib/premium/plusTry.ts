// Purify Plus, try each feature (r3-07, the owner's pick A, "a live look",
// locked 2026-10-30; boards/purify-master/variants/r3-07-plus-try.png). His
// notes 8 and 39 of build 80: "click on each and every single one so you can
// really see what each of them do in real time", and "going actual in-depth,
// showing like a visual for every single one".
//
// Every row of the Plus page ends in Try it. Try it turns the page into that
// feature's own screen for a moment, the real one, working: Ambience plays
// John 1 with Rain for a minute; a page has no clock. The arrow at its top
// goes back to the list, Next walks on to the following feature, and the
// plans stay held at the foot the whole time.
//
// A preview shows; it never grants. Nothing in it writes to the reader's
// stores or asks the server for anything but public words and pictures, and
// what a reader is entitled to is written by the server alone
// (lib/entitlements). What a reader does in a preview (a plan's day ticked,
// a verse answered, a frame tried on) lasts as long as the preview.
//
// Pure, so the tests can hold the order, the sounds and the palettes.

import type { AmbienceId } from "@/lib/ambience/ambience";
import type { PlusRow } from "@/lib/premium/plusRows";
import type { EventThreadData } from "@/lib/history/thread";

/** How long a sound plays in a preview before it stops: a minute, as drawn. A page has no clock. */
export const TRY_MINUTE_MS = 60_000;

/** The previews that play a sound, and the sound each begins with (Ambience: Rain). */
export const TRY_SOUND: Readonly<Record<string, AmbienceId>> = { ambience: "rain" };

/** The sound a preview begins with, or null for a page. */
export function trySoundOf(id: string | null | undefined): AmbienceId | null {
  return id ? (TRY_SOUND[id] ?? null) : null;
}

/** The row after this one, in the order the reader sees the list, or null at its end. */
export function nextTryRow(rows: readonly PlusRow[], id: string): PlusRow | null {
  const at = rows.findIndex((r) => r.id === id);
  return at >= 0 && at < rows.length - 1 ? rows[at + 1] : null;
}

/**
 * The chapter the Bible previews open: John 1, as the sheet draws it, the
 * app's own text (data/bible/john/1.json).
 */
export const TRY_CHAPTER = { book: "john", chapter: 1 } as const;

/** How much of John 1 a preview's page carries: enough to scroll. */
export const TRY_VERSES = 14;

/**
 * The palettes the reading modes preview shows, as app/globals.css sets them
 * (the :root theme for Dark, the html[data-reading-mode] blocks, and for the
 * look its html[data-look] block). Set on the preview's window only: the
 * reader's own palette is never touched. lib/premium/__tests__/plusTry.test.ts
 * holds every value to globals.css.
 *
 * Night sky is one of the fourteen looks (1.9, the arbiter's word of
 * 2026-11-10: "let the preview under Twenty reading modes show one of the
 * looks beside Dark, Candlelight and Monastery"). It was chosen on the
 * export: its sky lies behind the whole page and its sign stands at the
 * chapter's head, so both are seen in a window with no bar and no foot, and
 * every word stays at 4.5:1 or more over it. A look with a scene at the foot
 * (the Holy Mountain was tried) lays its picture under the last lines, which
 * a reader's screen fades out and a window does not.
 */
export const TRY_PALETTES = {
  default: { night: "#101013", nightSoft: "#1d1d20", nightDeep: "#0b0b0e", paper: "#ffffff" },
  candlelight: { night: "#050505", nightSoft: "#18181b", nightDeep: "#000000", paper: "#d4d4d8" },
  monastery: { night: "#0d1119", nightSoft: "#171e2b", nightDeep: "#080b11", paper: "#e6ebf4" },
  nightsky: { night: "#05070d", nightSoft: "#0f1420", nightDeep: "#020308", paper: "#edf0f6" },
} as const;

export type TryPalette = keyof typeof TRY_PALETTES;

/** The four in the order they stand under the window, each by its name's catalog key. */
export const TRY_PALETTE_ORDER: readonly { id: TryPalette; labelKey: string }[] = [
  { id: "default", labelKey: "settings.paletteDark" },
  { id: "candlelight", labelKey: "settings.paletteCandlelight" },
  { id: "monastery", labelKey: "settings.paletteMonastery" },
  { id: "nightsky", labelKey: "settings.paletteNightSky" },
];

/**
 * The look among them. Its window wears more than its four colours: the
 * look's own picture and sign, drawn by app/globals.css on [data-try-look].
 */
export const TRY_LOOK: TryPalette = "nightsky";

/** A palette as the CSS variables the page's utilities read, for the window's style. */
export function paletteVars(id: TryPalette): Record<string, string> {
  const p = TRY_PALETTES[id];
  return {
    "--color-night": p.night,
    "--color-night-soft": p.nightSoft,
    "--color-night-deep": p.nightDeep,
    "--color-paper": p.paper,
  };
}

/**
 * The Greek words the word study preview opens, the three John 1 begins
 * with: the Word (1:1), life (1:4) and light (1:4, 1:5). Strong's numbers,
 * as the study asks for them (app/api/bible/word).
 */
export const TRY_WORDS: readonly { strongs: string; lemma: string }[] = [
  { strongs: "3056", lemma: "λόγος" },
  { strongs: "2222", lemma: "ζωή" },
  { strongs: "5457", lemma: "φῶς" },
];

/**
 * Switching the word the preview studies (the owner's note 43 of build 80:
 * "it's also buggy in a couple frames and it's not smooth"). The three words
 * are loaded as the preview opens. The switch moves at once; the study shown
 * stays until the chosen word's verses are here, then the chosen comes in
 * over it while it goes out (components/billing/plusTry/TryWordStudy.tsx).
 * It used to be dropped at the tap, and the window stood nearly empty, the
 * word and "Finding every place", until the verses came over the network.
 */
export type WordSwitch = {
  /** The word chosen on the switch. */
  chosen: string;
  /** The word whose study the window shows. */
  shown: string;
  /** The study going out under the one coming in, and how far it was scrolled. */
  leaving: { strongs: string; y: number } | null;
  /** The words whose verses are here, or whose asking failed: a failure is shown, not waited on. */
  ready: readonly string[];
};

export type WordSwitchStep =
  | { type: "choose"; strongs: string; y: number }
  | { type: "ready"; strongs: string; y: number }
  | { type: "left" };

/** How long the study going out takes to go, in ms (app/globals.css, .plus-try-word-out). */
export const WORD_FADE_MS = 200;

export function startWordSwitch(first: string): WordSwitch {
  return { chosen: first, shown: first, leaving: null, ready: [] };
}

/** The chosen word comes in, the shown one going out from where it was scrolled to. */
function bringIn(s: WordSwitch, y: number): WordSwitch {
  if (s.chosen === s.shown) return s;
  return { ...s, shown: s.chosen, leaving: { strongs: s.shown, y } };
}

export function stepWordSwitch(s: WordSwitch, step: WordSwitchStep): WordSwitch {
  switch (step.type) {
    case "choose": {
      if (step.strongs === s.chosen) return s;
      // Nothing is shown yet (the first word still coming): nothing to keep.
      if (!s.ready.includes(s.shown)) return { ...s, chosen: step.strongs, shown: step.strongs, leaving: null };
      const next = { ...s, chosen: step.strongs };
      return s.ready.includes(step.strongs) ? bringIn(next, step.y) : next;
    }
    case "ready": {
      if (s.ready.includes(step.strongs)) return s;
      const next = { ...s, ready: [...s.ready, step.strongs] };
      return step.strongs === s.chosen ? bringIn(next, step.y) : next;
    }
    case "left":
      return s.leaving ? { ...s, leaving: null } : s;
  }
}

/** The verses of John 1 whose cross-references the preview offers, by number. */
export const TRY_REF_VERSES: readonly number[] = [1, 3, 4, 5, 14];

/**
 * Where an example entry's words come from: a Father's line the reading
 * plans already carry, word for word (data/plans/sayings.json, by plan and
 * day), on the chapter or verse it speaks of. Never invented, and always
 * shown with its author and the Example mark, never as the reader's own.
 */
export type TryExample = { plan: "gospels" | "psalter" | "proverbs"; day: number; book: string; chapter: number; verse?: number };

export const TRY_EXAMPLES = {
  /** The journal, today: St. John Chrysostom on Matthew 6. */
  journalToday: { plan: "gospels", day: 6, book: "matthew", chapter: 6 },
  /** The journal, yesterday: St. Augustine on Psalm 50. */
  journalYesterday: { plan: "psalter", day: 7, book: "psalms", chapter: 50 },
  /** The journal's "From this day": St. John Chrysostom on John 1:14. */
  fromThisDay: { plan: "gospels", day: 69, book: "john", chapter: 1, verse: 14 },
} as const satisfies Record<string, TryExample>;

/** The Florilegium's example gathering: John 1, two of its verses and a Father on it. */
export const TRY_GATHERING = {
  verses: [1, 5],
  father: TRY_EXAMPLES.fromThisDay,
} as const;

/** The verse the Remember the verse preview asks for: John 1:5. */
export const TRY_REMEMBER_VERSE = 5;

/**
 * The history preview's event: the Council of Ferrara–Florence, whose plate
 * and gallery are the fullest dress the timeline has (lib/history/events.ts).
 */
export const TRY_EVENT = "council-of-florence";

/**
 * The Thread the history preview follows (1.9, Plus's history: the owner's
 * pick of 2026-11-06): six steps of the Council of Florence, from the Greeks
 * sailing from Constantinople to the council's move to Florence, as
 * lib/history/thread.ts gives them. Written out here so the preview carries
 * neither the map's outline nor the event's account in the app's code;
 * lib/premium/__tests__/plusTry.test.ts holds them to the real Thread.
 */
export const TRY_THREAD: EventThreadData = {
  "home": {
    "name": "Florence",
    "x": 3272.2,
    "y": 452.3
  },
  "steps": [
    {
      "date": "27 November 1437",
      "text": "About seven hundred Greeks sail from Constantinople on papal galleys, at papal expense.",
      "year": "1437",
      "place": {
        "name": "Constantinople",
        "x": 3588.6,
        "y": 514.1
      },
      "mark": "1437",
      "line": "27 November · Constantinople"
    },
    {
      "date": "8 February 1438",
      "text": "The delegation lands at Venice.",
      "year": "1438",
      "place": {
        "name": "Venice",
        "x": 3291.5,
        "y": 415
      },
      "mark": "1438",
      "line": "8 February · Venice"
    },
    {
      "date": "9 April 1438",
      "text": "The first session at Ferrara with the Greeks present.",
      "pivotal": true,
      "year": "1438",
      "place": {
        "name": "Ferrara",
        "x": 3278.7,
        "y": 428.4
      },
      "mark": null,
      "line": "9 April · Ferrara"
    },
    {
      "date": "Summer 1438",
      "text": "Committees take up purgatory and reach no agreement.",
      "year": "1438",
      "place": null,
      "mark": null,
      "line": "Summer"
    },
    {
      "date": "8 October to 13 December 1438",
      "text": "Public sessions at Ferrara on whether the addition to the Creed was lawful. Mark of Ephesus speaks for the Greeks.",
      "year": "1438",
      "place": {
        "name": "Ferrara",
        "x": 3278.7,
        "y": 428.4
      },
      "mark": null,
      "line": "8 October to 13 December · Ferrara"
    },
    {
      "date": "January 1439",
      "text": "Plague and Florentine money move the council to Florence.",
      "year": "1439",
      "place": {
        "name": "Florence",
        "x": 3272.2,
        "y": 452.3
      },
      "mark": "1439",
      "line": "January · Florence"
    }
  ]
};
/** Where TRY_THREAD's steps start in the event's own: its fourth step. */
export const TRY_THREAD_FROM = 3;

/**
 * The Discord preview's example, as Settings draws its own: St John's Gospel,
 * halfway through chapter 3 (components/desktop/DiscordModes.tsx,
 * EXAMPLE_PLACE; the test holds the two together).
 */
export const TRY_DISCORD_PLACE = { kind: "scripture", book: "john", chapter: 3, chapters: 21, fraction: 0.5 } as const;

/**
 * How the Listen offline preview shows a book being saved: the real mark
 * filling chapter by chapter, then the check, in this long. Nothing is saved:
 * it is the mark's own three states, one after another.
 */
export const TRY_SAVE_MS = 4_200;

/** "Saving 7 of 21": the chapters done at `elapsed` of a save that takes TRY_SAVE_MS. */
export function savedSoFar(elapsed: number, total: number): number {
  if (total <= 0) return 0;
  const share = Math.max(0, Math.min(1, elapsed / TRY_SAVE_MS));
  return Math.min(total, Math.floor(share * total));
}
