/**
 * Hold the part that stands last in a scroller still on the screen while what
 * stands above it grows or shrinks (the ambience sheet's sounds, under the
 * volumes that open over them as a sound begins).
 *
 * A sheet stands on the screen's foot, so while it is shorter than its limit
 * it grows upward and its last part stays where it was. Once it is at its
 * limit and scrolls, what is added above would push that part down, so the
 * scroll takes it up: the part keeps its distance from the scroll's end, and
 * the scroll's end is the sheet's foot.
 *
 * The distance is kept as a number and the scroll set to it on every change,
 * never moved by the change since the last one. The first hold moved the
 * scroll by each step of a glide: a browser keeps the scroll in whole pixels
 * and a step under one pixel was let go, so the steps were lost one by one
 * and the sounds slid 7 and 9px under the finger (the gate's walk,
 * scripts/gate/ambience-sheet.mjs, Updates 28, 2026-11-13).
 *
 * `resized` answers a change of size above the part (a ResizeObserver);
 * `scrolled` answers the scroller's own scroll, which is the reader's unless
 * it lands where the hold put it.
 */
export type EndScroller = { scrollHeight: number; clientHeight: number; scrollTop: number };

export function holdAtEnd(box: EndScroller): { resized: () => void; scrolled: () => void } {
  const fromEnd = () => Math.max(0, box.scrollHeight - box.clientHeight - box.scrollTop);
  // How far above the scroll's end the reader stands: none while the sheet
  // fits, and none when it opens at the foot.
  let keep = fromEnd();
  let put: number | null = null;
  return {
    resized() {
      const want = Math.max(0, box.scrollHeight - box.clientHeight - keep);
      if (Math.abs(box.scrollTop - want) > 0.01) box.scrollTop = want;
      put = box.scrollTop;
    },
    scrolled() {
      // The hold's own scroll arrives as a scroll too: it changes nothing.
      if (put !== null && box.scrollTop === put) return;
      put = null;
      keep = fromEnd();
    },
  };
}
