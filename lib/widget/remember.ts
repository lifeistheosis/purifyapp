import { localBookNames, referenceIn } from "@/lib/bible/books";
import { stepWords } from "@/lib/remember/blanks";
import { addDays, backWords, dueOn, stepOf, type RememberStep, type RememberStore, type SavedVerse } from "@/lib/remember/schedule";

/**
 * Remember the verse on the home screen widget (1.9, s4-07 of
 * docs/1.9-build/ideas.json): the `remember` entry the app hands the widgets
 * (docs/WIDGETS.md, section 2).
 *
 * The widget asks what the Today card asks (components/today/RememberCard.tsx):
 * the verse's reference, and the verse at its step, its longer words blank,
 * each word as its first letter, or no words at all once it is said from
 * memory. The words are checked on the card, on Today, where a tap on the
 * widget leads (widget/today, lib/widget/open.ts); the widget never shows the
 * hidden words of a verse not yet answered.
 *
 * A widget is drawn by the phone, which cannot run the schedule, so the app
 * works the days out here, as the build bakes the Church's calendar for the
 * other widgets (lib/widget/dayTable.ts): one face for each of the next
 * seven days, keyed by the reader's civil day. Today's is the verse due, or
 * the verse answered today with when it comes back. A day ahead is the verse
 * that day brings if nothing is answered before it, which holds, since an
 * answer is only ever given in the app, and the app then hands the faces over
 * again. A widget whose day is not among them (the app not opened for a
 * week) says to open Purify, as every widget does with nothing true to show.
 *
 * Every word arrives finished, in the app's language: the reference with its
 * book in that language, and the line under the verse in the card's own
 * words. A widget never builds a sentence.
 */

/** How many days ahead a widget can draw without the app. */
export const REMEMBER_DAYS = 7;

/** One day's face. `done` only on the day a verse was answered. */
export type RememberFace = {
  /** The verse's reference, its book in the app's language: "Јован 3:16". */
  ref: string;
  /** Which step it is asked at: 1 missing words, 2 first letters, 3 from memory. Absent once answered. */
  step?: RememberStep;
  /** The verse as the widget shows it: blanks, first letters, the whole verse once answered; null when it shows no words. */
  words: string | null;
  /** The line under it: what to do, or when it comes back. */
  line: string;
  done?: true;
};

export type RememberEntry =
  /** Nothing saved to remember: the widget asks the reader to save a verse. */
  | { none: true }
  | { days: Record<string, RememberFace> };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** A blank as the widget writes it: a line as long as the word, as the card's blank is. */
const blank = (letters: number) => "_".repeat(Math.max(2, letters));

/** Letters, counting a letter with its accents as one: "ἀρχῇ" is four. */
const letters = (word: string) => (word.match(/\P{M}\p{M}*/gu) ?? []).length;

/**
 * The verse as the widget writes it at a step, in plain text, since a widget
 * draws text and not the card's lines: the blanked words as runs of "_",
 * each its word's length, and in the second step each word's first letter
 * kept, as lib/remember/schedule.ts's firstLetters writes it. The third step
 * shows no words. Punctuation and every word not blanked stay as they are.
 */
export function widgetVerse(text: string, step: RememberStep): string | null {
  if (step === 3) return null;
  const words = stepWords(text, step);
  if (!words.length) return null;
  return words
    .map((w) => {
      if (!w.blank) return w.lead + w.word + w.tail;
      const shown = step === 2 ? w.first + "_".repeat(Math.max(0, letters(w.word) - 1)) : blank(letters(w.word));
      return w.lead + shown + w.tail;
    })
    .join(" ");
}

/** The line under a verse at its step: the card's own words for it. */
function stepLine(t: Translate, step: RememberStep): string {
  return t(step === 3 ? "remember.line" : step === 2 ? "remember.lineFirst" : "remember.lineBlanks");
}

export type RememberInput = {
  /** The verses the reader saved, from their bookmarks. */
  saved: readonly SavedVerse[];
  /** The schedule as it is kept on the device (rememberStore). */
  store: RememberStore;
  /** The reader's civil day, from todayKey(). */
  today: string;
  t: Translate;
  /** Days ahead to work out; REMEMBER_DAYS unless a test says otherwise. */
  days?: number;
};

/**
 * Each day's face, from the reader's saved verses and the schedule kept on
 * the device. Undefined when there is no day to start from.
 */
export function rememberFaces(input: RememberInput): RememberEntry | undefined {
  const { saved, store, today, t } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return undefined;
  if (!saved.length) return { none: true };
  const books = localBookNames(t);
  const byKey = new Map(saved.map((v) => [v.key, v]));
  const ref = (v: SavedVerse) => referenceIn(v.label, v.book, books);

  const days: Record<string, RememberFace> = {};
  const count = Math.max(1, Math.min(input.days ?? REMEMBER_DAYS, 31));
  for (let i = 0; i < count; i++) {
    const day = i === 0 ? today : addDays(today, i);
    if (i === 0 && store.answeredOn === today) {
      // Answered today: that verse, whole, and when it comes back. A store
      // written before 1.9 does not say which verse it was (an answer given
      // on the old build on the day of the update), and a verse since taken
      // off the bookmarks has nothing to show: today then has no face, and
      // the widget says to open Purify, until tomorrow's face takes over.
      const answered = store.answeredKey ? byKey.get(store.answeredKey) : undefined;
      const entry = answered ? store.entries[answered.key] : undefined;
      if (answered && entry) {
        days[day] = {
          ref: ref(answered),
          words: store.texts[answered.key] ?? null,
          line: backWords(t, entry, today),
          done: true,
        };
      }
      continue;
    }
    const due = dueOn(saved, store.entries, day);
    if (!due) continue;
    const step = stepOf(store.entries[due.key]?.box ?? 0);
    const text = store.texts[due.key];
    days[day] = {
      ref: ref(due),
      step,
      words: text ? widgetVerse(text, step) : null,
      // A verse whose words have not been fetched yet shows its reference
      // and the line for saying it from memory, the step that needs none.
      line: stepLine(t, text ? step : 3),
    };
  }
  return { days };
}

/** The entry as the plugin keeps it: JSON, or undefined to leave the phone's as it is. */
export function rememberEntry(entry: RememberEntry | undefined): string | undefined {
  return entry === undefined ? undefined : JSON.stringify(entry);
}
