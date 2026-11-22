// Opening a step from its card on Today (the owner, 2026-11-22: "a lot of the
// times it doesn't even switch to the screen smoothly").
//
// The card's Begin is a link, and a tap on it sets two kinds of thing going
// that must not happen at the same moment:
//
//   what is only counted   a count sent, a milestone reached. At the tap:
//                          nothing on the screen changes for it.
//   what takes the card    the step written as taken, the Day 1 card
//   off Today              dismissed. Only once the card has left the screen
//                          with its page.
//
// Both were done at the tap. So the card was taken off Today and the page
// jumped under the finger before the page's own transition had begun, and
// the transition then pictured a Today that no longer held the card.
// Measured on the export of main on 2026-11-22, for three readers: the card
// gone 4 ms after the tap, the layout moved at 12 ms, the transition begun at
// 50 to 141 ms (docs/plans/onboarding-2.0.md, "A day of the week, worked on").
//
// Pure, so the order is tested directly
// (lib/onboarding/__tests__/openStep.test.ts). The card is
// components/onboarding/FirstStepsNudge.tsx, which calls `left` when it
// leaves the screen.

export type StepParts = {
  /** What is only counted. */
  count: () => void;
  /** What takes the card off Today. */
  keep: () => void;
};

export type StepOpening = {
  /** The reader tapped Begin. */
  tapped: () => void;
  /** The card has left the screen. */
  left: () => void;
};

/**
 * One opening of one step. A second tap before the card has gone counts
 * nothing more; the card leaving with no tap keeps nothing; and what is kept
 * is kept once.
 */
export function stepOpening(parts: StepParts): StepOpening {
  let waiting = false;
  return {
    tapped() {
      if (waiting) return;
      waiting = true;
      parts.count();
    },
    left() {
      if (!waiting) return;
      waiting = false;
      parts.keep();
    },
  };
}
