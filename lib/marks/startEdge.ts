import type { Box } from "./dom";

/**
 * How far a box painted over a line of text stands from its layer's start
 * edge: its left in a page read left to right, its right in Arabic. A wash
 * placed so (inset-inline-start) turns round with the page; placed with left
 * it stayed where it was measured, so in Arabic the reading's wash and the
 * reader's marks did not mirror (build 98 note 2, checkMock's mirror rule).
 * `width` is the layer's, measured with the box.
 */
export function fromStart(box: Pick<Box, "left" | "right">, width: number, rtl: boolean): number {
  return rtl ? width - box.right : box.left;
}

/** Whether a layer drawn inside `el` reads right to left. */
export function readsRtl(el: Element | null | undefined): boolean {
  return !!el && getComputedStyle(el).direction === "rtl";
}
