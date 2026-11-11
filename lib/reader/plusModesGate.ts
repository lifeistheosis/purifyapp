// The Plus answer for the reading palettes, held ONCE for the whole app.
//
// It was held once per part. Every part that asked "may this reader wear a
// Plus palette?" (the part that dresses the app, Settings' row, the Reading
// mode page, the reader's own settings, the switches under them) asked when
// it first appeared and kept what it heard. The part that dresses the app
// lives as long as the app is open, so its answer was from the moment the
// app opened; a page asked when it was opened. Whenever the answer changed
// in between, the two disagreed for as long as the app stayed open.
//
// The owner met it on build 93 (docs/1.9-build/notes/build-93.md, note 3,
// 2026-11-11: "So this screen actually doesn't do anything. When I click on
// the stuff, it doesn't change anything."). He opened the app signed out,
// signed in, opened You, Reading mode and tapped Dawn: the page, asked after
// the sign-in, said yes, kept his tap and drew the check; the dresser, asked
// before it, still said no and left the app in Dark. Only a purchase told
// anything to ask again. A sign-in did not, and neither did a phone finding
// its signal.
//
// So there is one answer, every part reads it, and it is asked again when it
// can have changed (components/reader/usePlusReadingModes.ts says when). Two
// parts cannot disagree, because there is nothing for them to disagree with.
//
// And a second fault, found beside the first on the export: while the answer
// was on its way, every Plus palette was put down, so a reader WITH Plus
// opened the app to their look, then Dark, then their look again once the
// account server had answered (seven seconds of Dark on a slow signal). The
// device now keeps what it last heard, and a reader it last knew to have
// Plus keeps their palette while it asks. What it last heard never draws a
// lock and never outlives the answer: the answer always has the last word.
//
// And a third thing, by the arbiter's word the same night (CLAUDE.md, "A
// release ships finished"): a reader with Plus who opens the app with no
// signal. The server cannot be asked, and every Plus palette was put down
// until it could. A palette is cosmetic and on the phone, so a device that
// last knew its reader to have Plus keeps their palette with no signal until
// the server answers otherwise. Nothing the server grants (sync, downloads,
// voices) is opened that way: this is the palettes' gate and nothing else's.
//
// Pure, and given what it needs, so it is tested without a phone
// (lib/reader/__tests__/plusModesGate.test.ts).

export type PlusModes = {
  /** May the Plus palettes be worn now? */
  allowed: boolean;
  /** The answer has come and it is no: the Plus sheet may be shown. False while asking. */
  locked: boolean;
};

/** Plus is not asked for on this surface: every palette is free to wear. */
export const PLUS_MODES_OPEN: PlusModes = Object.freeze({ allowed: true, locked: false });
/** Asked for, and nothing known yet: not worn, and no lock drawn at a reader who may well have Plus. */
export const PLUS_MODES_ASKING: PlusModes = Object.freeze({ allowed: false, locked: false });
/** Asked for, and this device last heard yes: worn while the answer is on its way. */
export const PLUS_MODES_KEPT: PlusModes = Object.freeze({ allowed: true, locked: false });

/** An answer this young is not asked for again by a part that only appeared. */
export const FRESH_MS = 5_000;

export type PlusModesSource = {
  /** Is Plus asked for on this surface? Asked each time, since a shell may not know its own kind at first. */
  enforced: () => boolean;
  /** The live answer: has this reader the Plus layer? Rejects when the server could not be asked (no signal). */
  ask: () => Promise<boolean>;
  /** What this device last heard, or null when it has heard nothing. */
  recall: () => boolean | null;
  /** Keep a live answer for the next time the app opens. */
  remember: (answer: boolean) => void;
  /** The clock, for tests. */
  now?: () => number;
};

export type PlusModesGate = {
  /** The answer as it stands. The same object until it changes. */
  get: () => PlusModes;
  /** Be told when it changes. Returns the way to stop. */
  subscribe: (changed: () => void) => () => void;
  /**
   * Ask again. `force` when something has happened that can change the
   * answer (a sign-in, a sign-out, a purchase, the signal back): it asks even
   * if an asking is under way, and an older answer still on its way is then
   * dropped when it lands. Without it, an asking under way or an answer a
   * moment old is enough.
   */
  refresh: (force?: boolean) => Promise<void>;
};

export function createPlusModesGate(source: PlusModesSource): PlusModesGate {
  const now = source.now ?? Date.now;
  const listeners = new Set<() => void>();
  let state: PlusModes | null = null;
  // Each asking has a number; only the newest one's answer is taken.
  let turn = 0;
  let under: Promise<void> | null = null;
  let answeredAt: number | null = null;

  const first = (): PlusModes => {
    if (!source.enforced()) return PLUS_MODES_OPEN;
    return source.recall() === true ? PLUS_MODES_KEPT : PLUS_MODES_ASKING;
  };

  const get = (): PlusModes => (state ??= first());

  const set = (next: PlusModes) => {
    const was = get();
    if (was.allowed === next.allowed && was.locked === next.locked) return;
    state = next;
    for (const changed of [...listeners]) changed();
  };

  const refresh = (force = false): Promise<void> => {
    if (!source.enforced()) {
      turn++;
      under = null;
      set(PLUS_MODES_OPEN);
      return Promise.resolve();
    }
    if (!force) {
      if (under) return under;
      if (answeredAt !== null && now() - answeredAt < FRESH_MS) return Promise.resolve();
    }
    const mine = ++turn;
    const asking = source
      .ask()
      .then(
        (yes): { next: PlusModes; heard: boolean } => ({ next: { allowed: yes, locked: !yes }, heard: true }),
        // The server could not be asked. A reader this device last knew to
        // have Plus keeps their palette until it answers; for any other the
        // Plus palettes stay shut, and a tap still opens the sheet, as it
        // did. What the device last heard is left as it was.
        (): { next: PlusModes; heard: boolean } => ({ next: source.recall() === true ? PLUS_MODES_KEPT : { allowed: false, locked: true }, heard: false }),
      )
      .then(({ next, heard }) => {
        if (mine !== turn) return;
        under = null;
        answeredAt = now();
        if (heard) source.remember(next.allowed);
        set(next);
      });
    under = asking;
    return asking;
  };

  const subscribe = (changed: () => void) => {
    listeners.add(changed);
    return () => {
      listeners.delete(changed);
    };
  };

  return { get, subscribe, refresh };
}
