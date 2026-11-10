/**
 * Easy Scroll's sums (1.9, build 89 note 7, his name for it; by the verse
 * since build 90 note 6): kept here, pure, so the tests can hold them without
 * a browser. The gesture itself is the phone's own scroll snapping
 * (app/globals.css, "Easy Scroll"); the hooks that measure the page are
 * components/prayers/service/useEasyScroll.ts and usePassedSteps.ts.
 *
 * Every measure is in the same frame of reference as the reading place
 * (lib/ui/readingPlace.ts): pixels from the top of the screen, or from the top
 * of the page when the caller adds the scroll to both sides.
 */

/** How near the reading place a prayer's first line counts as standing on it. */
export const ON_PLACE_PX = 3;

/**
 * Where a verse taller than the room under the reading place rests inside
 * itself, in pixels from its own top (build 90 note 6): a room less one line
 * apart, so each short swipe shows its next part with one line kept for the
 * eye, and the last with its end at the foot of what can be seen. A verse
 * that fits the room rests only at its start. The verse stays the one lit
 * all the while, its top being above the reading place and the next verse's
 * below it (components/prayers/service/useLitLine.ts).
 */
export function restsInside(height: number, room: number, line: number): number[] {
  if (height <= room + 1) return [];
  const step = Math.max(line, room - line);
  const last = height - room;
  const out: number[] = [];
  for (let at = step; at < last - 1; at += step) out.push(Math.round(at));
  out.push(Math.round(last));
  return out;
}

/** A place where a prayer rests, and what kind of rest it is. */
export type Stop = {
  /** From the prayer's own top, in pixels: this point stands at the reading place. */
  at: number;
  /**
   * edge: a prayer's first verse, or its last (a fling never runs past one);
   * verse: a verse between them; inside: a part of a verse taller than the
   * room; after: the prayer's last rest, a line into its last verse, or, when
   * that verse is tall, where its end stands at the foot (a fling never runs
   * past this either, so the next prayer comes on a swipe of its own).
   */
  kind: "edge" | "verse" | "inside" | "after";
};

/**
 * Every place a prayer rests (build 90 note 6, his words: "I noticed myself
 * scrolling to another section when I just realistically want to scroll to
 * the next verse or next bar within the same section"): each verse's start,
 * the parts of a verse taller than the room, and one more rest in the last
 * verse that a swipe the finger carries over it lands on. Until then a
 * prayer rested only at its first line and, when taller than the screen, at
 * its end at the foot, so a swipe from there carried the verses still below
 * the reading place off the screen unread.
 *
 * `verses` are each verse's top (from the prayer's own top), its height and
 * the height of one of its lines, in order; a step with no verses is given
 * its name as its one verse.
 */
export function stopsOf(verses: readonly { top: number; height: number; line: number }[], room: number): Stop[] {
  const out: Stop[] = [];
  verses.forEach((v, i) => {
    const last = i === verses.length - 1;
    out.push({ at: Math.round(v.top), kind: i === 0 || last ? "edge" : "verse" });
    const inside = restsInside(v.height, room, v.line);
    if (!last) {
      for (const o of inside) out.push({ at: Math.round(v.top + o), kind: "inside" });
      return;
    }
    // The last verse: its parts, then its last rest, which a fling cannot pass.
    const end = inside.length ? inside[inside.length - 1] : Math.round(Math.min(v.line, v.height));
    for (const o of inside.slice(0, -1)) out.push({ at: Math.round(v.top + o), kind: "inside" });
    if (end > 0) out.push({ at: Math.round(v.top + end), kind: "after" });
  });
  return out;
}

/** Whether a rest is one a fling may not pass. */
export const holdsAFling = (kind: Stop["kind"]): boolean => kind === "edge" || kind === "after";

/**
 * Whether the hand feels the click as the page rests (build 89 note 7, his
 * "haptic feedback when they scroll to each section"; kept once per prayer at
 * build 90 note 6): only when the prayer resting at the reading place is a
 * new one, never for another verse of the same prayer.
 */
export function clicksFor(arrived: string | null, now: string | null): boolean {
  return now !== null && now !== arrived;
}

export type PassState = {
  /** Prayers seen at or below the reading place during this visit. */
  seen: Set<string>;
  /** Prayers already counted, which are not counted again. */
  told: Set<string>;
};

/**
 * The prayers a reader moving down has just passed: seen at or below the
 * reading place before, wholly above it now. A prayer the page opened past
 * (Your rule beginning further on) was never seen below the place, so it is
 * not counted as prayed. Moving back up counts nothing and takes nothing back.
 */
export function passedNow(steps: readonly { id: string; bottom: number }[], place: number, state: PassState): string[] {
  const out: string[] = [];
  for (const { id, bottom } of steps) {
    if (state.told.has(id)) continue;
    if (bottom >= place) {
      state.seen.add(id);
      continue;
    }
    if (state.seen.has(id)) {
      state.told.add(id);
      out.push(id);
    }
  }
  return out;
}

/** The prayer whose first line stands at the reading place, or null. */
export function stepAtPlace(starts: readonly { id: string; top: number }[], place: number, slack: number = ON_PLACE_PX): string | null {
  for (const { id, top } of starts) if (Math.abs(top - place) <= slack) return id;
  return null;
}
