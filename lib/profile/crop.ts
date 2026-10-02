/**
 * The arithmetic of placing a picture in a frame, for ImageCropSheet
 * (components/profile/ImageCropSheet.tsx). Pure, so it is tested on its own.
 *
 * A view is the image point (in the picture's own pixels) at the centre of
 * the frame, and a zoom. At zoom 1 the picture just covers the frame; the
 * frame may never show past the picture's edge.
 */

export type CropShape = "avatar" | "banner";

/** Frame shape and the size of the saved picture. A photo is drawn as a circle everywhere. */
export const CROP_SHAPES: Record<CropShape, { aspect: number; out: readonly [number, number] }> = {
  avatar: { aspect: 1, out: [512, 512] },
  banner: { aspect: 3, out: [1500, 500] },
};

export const MAX_ZOOM = 4;

export type View = { zoom: number; cx: number; cy: number };
type Size = { w: number; h: number };

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(1, Number.isFinite(z) ? z : 1));

/** Screen pixels per picture pixel. */
export function scaleOf(zoom: number, img: Size, box: Size): number {
  return Math.max(box.w / img.w, box.h / img.h) * zoom;
}

/** Keep the frame covered: the centre may not come closer to an edge than half the frame. */
export function clampView(v: View, img: Size, box: Size): View {
  const zoom = clampZoom(v.zoom);
  const s = scaleOf(zoom, img, box);
  const halfW = box.w / (2 * s);
  const halfH = box.h / (2 * s);
  return {
    zoom,
    cx: Math.min(img.w - halfW, Math.max(halfW, v.cx)),
    cy: Math.min(img.h - halfH, Math.max(halfH, v.cy)),
  };
}

/** Move by a drag of (dx, dy) screen pixels. */
export function panView(v: View, dx: number, dy: number, img: Size, box: Size): View {
  const s = scaleOf(v.zoom, img, box);
  return clampView({ ...v, cx: v.cx - dx / s, cy: v.cy - dy / s }, img, box);
}

/** Zoom to `zoom`, keeping the picture point under (px, py) in the frame where it is. */
export function zoomView(v: View, zoom: number, img: Size, box: Size, px = box.w / 2, py = box.h / 2): View {
  const next = clampZoom(zoom);
  const s = scaleOf(v.zoom, img, box);
  const sNext = scaleOf(next, img, box);
  const ox = px - box.w / 2;
  const oy = py - box.h / 2;
  return clampView({ zoom: next, cx: v.cx + ox / s - ox / sNext, cy: v.cy + oy / s - oy / sNext }, img, box);
}

/** The part of the picture the frame shows, in the picture's own pixels. */
export function cropRect(v: View, img: Size, box: Size) {
  const s = scaleOf(v.zoom, img, box);
  return { sx: v.cx - box.w / (2 * s), sy: v.cy - box.h / (2 * s), sw: box.w / s, sh: box.h / s };
}
