/**
 * What a held finger is holding.
 *
 * In the phone apps the system's own text selection is off (app/globals.css,
 * "The apps select nothing by themselves"): the owner, 2026-10-05, of holding
 * the screen and moving, "it acts as if you're going to copy the whole screen
 * and the screen turns blue. I want you to remove that feature so there's a
 * native system built into the app. Where when you copy anything, it uses our
 * system." A verse and a paragraph of the Fathers already had Purify's own
 * hold: the tool pill, with highlight, bookmark, note and the rest
 * (components/bible/MobileVerseToolbar.tsx). Every other piece of text had
 * only the phone's selection, which is the thing that was removed.
 *
 * So a hold on any other text offers Copy, for the block under the finger:
 * a prayer's paragraph, a line of commentary, a post, a recipe step. This
 * module decides WHICH block, and what its words are. The pill and the
 * gesture are components/native/PressToCopy.tsx.
 *
 * No React and no globals beyond the element handed in, so it is tested with
 * plain objects.
 */

/** A hold is this long. A little past the verse pill's 400 ms, so a verse's own hold always wins the race it cannot lose anyway. */
export const PRESS_MS = 450;

/** A finger that travels this far is scrolling, not holding. */
export const PRESS_SLOP_PX = 10;

/** Fewer characters than this is a label, not something to copy. */
export const MIN_CHARS = 2;

/**
 * How many characters of its OWN an element needs before it counts as holding
 * words (see `wordsHolder`). A dozen: more than a count or a badge, less than
 * the shortest line of a prayer.
 */
export const OWN_WORDS_MIN = 12;

/** How far up from the finger to look for the element that holds the words. */
const HOLDER_DEPTH = 4;

/**
 * Text that is its own thing to copy. A list item before a paragraph inside
 * it would copy half a step, so the nearest of these wins, whichever it is.
 * `data-copy` marks anything else worth holding: an order number, a code.
 */
export const BLOCK_SELECTOR = "[data-copy], p, li, blockquote, h1, h2, h3, h4, dd, dt, figcaption, td, pre";

/**
 * Where a hold is not for copying:
 *   - text with tools of its own (`data-own-press`: a verse, a paragraph of
 *     the Fathers), which open their own pill;
 *   - anything that is pressed to DO something, where a hold is a slow tap;
 *   - a field, which keeps the phone's own selection so it can be typed in;
 *   - a bar. Its words are navigation.
 * `data-no-press` opts anything else out.
 */
export const SKIP_SELECTOR = [
  "[data-own-press]",
  "[data-no-press]",
  "a",
  "button",
  "summary",
  "label",
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='option']",
  "[role='switch']",
  "[role='slider']",
  "nav",
].join(", ");

/** A no-break space, by its number: an invisible character has no place in source. */
const NBSP = String.fromCharCode(160);

type Closest = { closest?: (selector: string) => unknown };
type TextBlock = { innerText?: string | null; textContent?: string | null };
type TextNode = { nodeType?: number; textContent?: string | null };
type Holder = TextBlock & { childNodes?: ArrayLike<TextNode>; parentElement?: Holder | null };

/** True when the element has words directly inside it, not only inside its children. */
function hasOwnWords(el: Holder): boolean {
  const kids = el.childNodes;
  if (!kids) return false;
  let n = 0;
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    // 3 is a text node.
    if (kid.nodeType === 3) n += (kid.textContent ?? "").trim().length;
  }
  return n >= OWN_WORDS_MIN;
}

/**
 * The element that holds the words under the finger, where no tag says so.
 *
 * Not all of Purify's prose is a paragraph. Measured on the 1.5.2 export: on
 * a prayer rule 81% of the words are in a plain `div` (a whole prayer, its
 * lines kept by `white-space: pre-line`), and the same on a lesson, a topic
 * and a history article. A hold that only knew `p` would have offered Copy
 * for a prayer's rubric and nothing for the prayer.
 *
 * So, failing a block: the nearest element, from the finger outward, that has
 * a dozen characters of its own. The touched element first, so a prayer's
 * `div` is the prayer; then a few parents, so a word set in italics inside
 * it still finds it.
 */
export function wordsHolder<T extends Holder>(target: Holder | null): T | null {
  let el: Holder | null | undefined = target;
  for (let i = 0; el && i < HOLDER_DEPTH; i++, el = el.parentElement) {
    if (hasOwnWords(el)) return el as T;
  }
  return null;
}

/** The words of a block as a reader would type them out. */
export function blockText(block: TextBlock): string {
  const raw = block.innerText ?? block.textContent ?? "";
  return raw
    .split(NBSP)
    .join(" ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The block a touch on `target` would copy, or null when a hold there is not
 * for copying. Generic over the element type so the test needs no DOM.
 */
export function pressBlock<T extends TextBlock>(target: (Closest & Holder) | null): T | null {
  if (!target || typeof target.closest !== "function") return null;
  if (target.closest(SKIP_SELECTOR)) return null;
  const block = (target.closest(BLOCK_SELECTOR) as T | null) ?? wordsHolder<T & Holder>(target);
  if (!block) return null;
  return blockText(block).length >= MIN_CHARS ? block : null;
}

/** True once a finger has moved far enough from where it landed to be a scroll. */
export function hasDrifted(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  return Math.abs(to.x - from.x) > PRESS_SLOP_PX || Math.abs(to.y - from.y) > PRESS_SLOP_PX;
}
