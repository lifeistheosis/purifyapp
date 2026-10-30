/**
 * The reader size slider in Settings (1.8, the owner's pick A of round 3,
 * "Lit panels": a verse of John at the size chosen, over a slider of four
 * stops; Homebase/boards/purify-master/variants/r3-01-settings). Pure, so
 * lib/settings/__tests__/sizeSlider.test.ts holds where a tap, a drag and a
 * key land; components/settings/ReaderSize.tsx draws it.
 *
 * The stops are spread evenly along the track, smallest first. In a
 * right-to-left language the track runs the other way, smallest on the right,
 * as the page reads.
 */

/** The stop nearest a point on the track: `x` and `left` in the same pixels, the track `width` wide. */
export function stopAt(x: number, left: number, width: number, count: number, rtl = false): number {
  if (count < 2 || !(width > 0)) return 0;
  const along = Math.min(1, Math.max(0, (x - left) / width));
  return Math.round((rtl ? 1 - along : along) * (count - 1));
}

/**
 * Where a key moves the slider, or null for a key that is not the slider's.
 * Up and Page Up always grow the text; Left and Right follow the track, so
 * in a right-to-left language Left is the larger side.
 */
export function stopForKey(key: string, at: number, count: number, rtl = false): number | null {
  const last = Math.max(0, count - 1);
  const to = (n: number) => Math.min(last, Math.max(0, n));
  switch (key) {
    case "ArrowRight":
      return to(at + (rtl ? -1 : 1));
    case "ArrowLeft":
      return to(at + (rtl ? 1 : -1));
    case "ArrowUp":
    case "PageUp":
      return to(at + 1);
    case "ArrowDown":
    case "PageDown":
      return to(at - 1);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/** A stop's place along the track, as a share of its length: 0 for the first, 1 for the last. */
export function stopShare(at: number, count: number): number {
  return count < 2 ? 0 : Math.min(1, Math.max(0, at / (count - 1)));
}
