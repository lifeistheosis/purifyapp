import type { CSSProperties } from "react";

/**
 * A window onto a picture (1.8, the councils' books, the owner's pick of
 * r3-03): a book whose cover is a part of a larger picture, cut to show one
 * thing in it. A council's documents are each a window onto the council's
 * own icon (the throne with the Gospel for its Creed, the Fathers on the left
 * for its letter), so its shelf reads as one picture and each book as a part.
 *
 * `x` and `y` are the point to show, as fractions of the picture from its
 * left and top; `zoom` is how much nearer than the picture filling the box
 * (1 is the box filled, as every other cover is). The picture fills the box
 * with that point at the same place in the box, and is enlarged about it, so
 * it never uncovers an edge and the point never moves.
 */
export type CoverWindow = { x: number; y: number; zoom: number };

/** The window as the picture's own style, laid over `object-fit: cover`. */
export function windowStyle(w: CoverWindow): CSSProperties {
  const at = `${pct(w.x)} ${pct(w.y)}`;
  return {
    objectPosition: at,
    transformOrigin: at,
    // Never less than the box filled: a window smaller than 1 would show the ground.
    transform: `scale(${+Math.max(1, w.zoom).toFixed(3)})`,
  };
}

const pct = (f: number) => `${+(Math.min(1, Math.max(0, f)) * 100).toFixed(2)}%`;
