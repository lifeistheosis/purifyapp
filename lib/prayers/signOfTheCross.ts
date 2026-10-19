/**
 * The drawing of the Sign of the Cross in Learn to pray (1.7.1): the owner's
 * note of 2026-10-17 asked for "a visual representation on what that
 * actually looks like on how you do the cross".
 *
 * It shows only what the lesson says, in the lesson's order
 * (data/prayers/learning/lessons.json, "sign-of-the-cross"): the right hand
 * with the thumb and first two fingers joined at the tips and the last two
 * folded flat against the palm, then the four touches, forehead, abdomen,
 * right shoulder, left shoulder. Its words are the lesson's own ("Three
 * fingers joined, two folded. Forehead, abdomen, right shoulder, left
 * shoulder."), and nothing is added to them. The figure is drawn as the
 * reader sees themself, so their right is on the right, the way the lesson
 * says it: "right, then left".
 *
 * The figure and its words are ours, so they wait for a future clergy
 * review like the rest of 1.7's prayer pages (docs/editorial-standards.md,
 * Clergy item 13). lib/prayers/__tests__/signOfTheCross.test.ts holds the
 * order to the lesson, the words to every language, and the mark itself.
 */

/** The lesson the drawing belongs to. */
export const CROSS_FIGURE_LESSON = "sign-of-the-cross";

export const SIGN_OF_THE_CROSS_REVIEW = {
  status: "awaiting-clergy-review",
  drafted: "2026-10-17",
  basis:
    "The lesson's own words: the thumb and first two fingers of the right hand joined at the tips, the ring and little fingers folded flat against the palm; then the forehead, the abdomen, the right shoulder and the left shoulder.",
} as const;

export type CrossTouch = {
  /** Its number on the drawing, in the lesson's order. */
  n: 1 | 2 | 3 | 4;
  /** The catalog key of its name. */
  key: string;
  /** How the English lesson names it. */
  lessonWord: string;
};

/** The four touches, in the order the lesson gives them. */
export const CROSS_TOUCHES: readonly CrossTouch[] = [
  { n: 1, key: "prayers.learning.cross.forehead", lessonWord: "forehead" },
  { n: 2, key: "prayers.learning.cross.abdomen", lessonWord: "abdomen" },
  { n: 3, key: "prayers.learning.cross.rightShoulder", lessonWord: "right shoulder" },
  { n: 4, key: "prayers.learning.cross.leftShoulder", lessonWord: "left shoulder" },
];

/** The other words the drawing carries. */
export const CROSS_FIGURE_KEYS = {
  /** The drawing's accessible name: every step, in order. */
  figure: "prayers.learning.cross.figure",
  hand: "prayers.learning.cross.hand",
  joined: "prayers.learning.cross.joined",
  folded: "prayers.learning.cross.folded",
  replay: "prayers.learning.cross.replay",
} as const;

/** Every catalog key the drawing uses, for the tests. */
export const CROSS_FIGURE_ALL_KEYS: readonly string[] = [
  ...Object.values(CROSS_FIGURE_KEYS),
  ...CROSS_TOUCHES.map((t) => t.key),
];
