"use client";

/**
 * Now Playing's grey, soft picture behind it all, made before the tap (build
 * 98 note 8, his word of 2026-11-15: "make the music player opening more
 * smooth"; Updates 98h). It was the cover again under a filter, grayscale,
 * blur(42px) and half the light, on a box 8rem larger than the panel, drawn
 * once the slide had ended. Its first draw was the longest frame of the
 * opening, with nothing moving but its own fade: the picture decoded again at
 * the box's size and blurred across all of it (at a phone's speed, a 49ms
 * decode and 70ms of raster, the page waiting 55ms on them).
 *
 * So the picture is read small, cropped as the box crops it, while the player
 * stands closed (`readBackdrop`), and blurred into a canvas an eighth of the
 * box's size when it is shown (`paintBackdrop`): the same filter with the blur
 * scaled to the canvas, the edges fading as the filter faded them, stretched
 * back to the box by the screen, which a picture that soft does not show. No
 * filter is left on anything on the screen. Where a canvas cannot take a
 * filter (an older Safari), the player keeps the filter on the cover, as
 * before (`bakesBackdrop`).
 */
export const BACKDROP_FILTER = "grayscale(1) blur(42px) brightness(0.5)";
/** The canvas's size against the box it stands for. */
export const BACKDROP_SCALE = 1 / 8;
/** How far the box reaches past the panel on every side (`-inset-16`, 4rem). */
export const BACKDROP_BLEED = 64;

export type Box = { width: number; height: number };
export type Crop = { sx: number; sy: number; sw: number; sh: number };

/** The part of a picture that `object-fit: cover`, centred, shows in a box. */
export function coverCrop(natural: Box, box: Box): Crop {
  const scale = Math.max(box.width / natural.width, box.height / natural.height);
  const sw = Math.min(natural.width, box.width / scale);
  const sh = Math.min(natural.height, box.height / scale);
  return { sx: (natural.width - sw) / 2, sy: (natural.height - sh) / 2, sw, sh };
}

/** The canvas's pixels for a box, never less than one. */
export function backdropPixels(box: Box): Box {
  return { width: Math.max(1, Math.round(box.width * BACKDROP_SCALE)), height: Math.max(1, Math.round(box.height * BACKDROP_SCALE)) };
}

/** The filter as the canvas draws it: the same, the blur scaled to the canvas. */
export function canvasFilter(): string {
  return BACKDROP_FILTER.replace(/blur\((\d+(?:\.\d+)?)px\)/, (_, px: string) => `blur(${Number(px) * BACKDROP_SCALE}px)`);
}

/** Whether this browser can blur a picture into a canvas (Chrome, Android's web view). */
export function bakesBackdrop(): boolean {
  return typeof window !== "undefined" && typeof window.createImageBitmap === "function" && typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;
}

export type Backdrop = { bitmap: ImageBitmap; pixels: Box; src: string };

/**
 * The picture read small for a panel of `panel`'s size, cropped as the box
 * crops it. Null when it cannot be (not loaded, or the browser refuses it).
 * Another origin's picture is allowed: the canvas it is drawn into is only
 * shown, never read.
 */
export async function readBackdrop(img: HTMLImageElement, panel: Box): Promise<Backdrop | null> {
  if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) return null;
  const box = { width: panel.width + 2 * BACKDROP_BLEED, height: panel.height + 2 * BACKDROP_BLEED };
  const pixels = backdropPixels(box);
  const { sx, sy, sw, sh } = coverCrop({ width: img.naturalWidth, height: img.naturalHeight }, box);
  try {
    const bitmap = await createImageBitmap(img, sx, sy, sw, sh, { resizeWidth: pixels.width, resizeHeight: pixels.height, resizeQuality: "high" });
    return { bitmap, pixels, src: img.currentSrc || img.src };
  } catch {
    return null;
  }
}

/** Blurs the picture read small into the canvas shown behind the player. */
export function paintBackdrop(canvas: HTMLCanvasElement, backdrop: Backdrop): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = backdrop.pixels.width;
  canvas.height = backdrop.pixels.height;
  ctx.filter = canvasFilter();
  ctx.drawImage(backdrop.bitmap, 0, 0, backdrop.pixels.width, backdrop.pixels.height);
}
