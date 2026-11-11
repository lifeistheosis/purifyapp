// The chant at hand: whether a prayer page offers its chant in the bar at the
// top of the screen, and the way to open it from there.
//
// It began as a pill (1.8, the owner's pick B, Immersive, for while you
// pray): once Pray with had scrolled up off the screen and nothing sounded,
// "Pray with chant" waited at the foot of the screen, one tap from the line
// being prayed. A fresh pair of eyes met it on build 93 (docs/1.9-build/
// notes/fresh-eyes.md, L1): the pill lay across a line of the Trisagion, a
// floating pill over the prayer's own words, which his rule of 2026-11-10
// keeps out ("Floating pills only where they belong", CLAUDE.md).
//
// So the chant is still one tap away at any line, and nothing floats over the
// prayer: at the same moment the pill came, a button comes in the page's bar
// beside search (components/player/ChantInBar.tsx). Pray with is far down
// the page from the bar, mounted by the route, so the two meet here: Pray
// with says when the chant is offered and how to open its picker, and the
// bar's button reads it. A module store, like lib/player/sheet.ts.
//
// Pure, so it is tested without a phone (lib/player/__tests__/
// chantAtHand.test.ts).

/** What Pray with hands over while its chant is offered: the way to open the picker. */
export type ChantOffer = { open: () => void };

let offer: ChantOffer | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  for (const changed of [...listeners]) changed();
}

/**
 * Offer the chant in the bar. Returns the way to take the offer back, which
 * takes back only its own: a page that is leaving cannot withdraw the offer
 * of the page that has just come.
 */
export function offerChantAtHand(next: ChantOffer): () => void {
  offer = next;
  tell();
  return () => {
    if (offer !== next) return;
    offer = null;
    tell();
  };
}

/** Is the chant offered now? */
export function chantAtHand(): boolean {
  return offer !== null;
}

/** Be told when the offer comes or goes. Returns the way to stop. */
export function onChantAtHand(changed: () => void): () => void {
  listeners.add(changed);
  return () => {
    listeners.delete(changed);
  };
}

/** Open the offered chant's picker. Nothing offered, nothing opens. */
export function openChantAtHand(): void {
  offer?.open();
}
