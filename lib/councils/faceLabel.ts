/**
 * The size of the word under a Father's face in a council's row of faces
 * (components/councils/CouncilFathers.tsx; build 83's walk read "Athanasi..."
 * at 390 px): the design's 10.5 px, or smaller where the word would not fit
 * its column whole, as a part of the column's own width (each face's cell is
 * a size container). A word is never cut. 0.62 of the size is a wide letter
 * of DM Sans at its weight, so the estimate errs on the side of room.
 *
 * Its own small file, with no registry in it: the row is drawn on the device.
 */
export const LABEL_PX = 10.5;
export const LETTER_EM = 0.62;

export function faceLabelSize(label: string): string {
  const cqw = 100 / (LETTER_EM * Math.max(1, label.length));
  return `min(${LABEL_PX}px, ${+cqw.toFixed(2)}cqw)`;
}
