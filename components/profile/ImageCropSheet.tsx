"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Minus } from "@/components/ui/icons/Minus";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import {
  CROP_SHAPES,
  MAX_ZOOM,
  cropRect,
  panView,
  scaleOf,
  zoomView,
  type CropShape,
  type View,
} from "@/lib/profile/crop";

export type { CropShape };

/**
 * Place a picture before it becomes your photo or your banner: drag to move
 * it, pinch, scroll or slide to zoom, then keep exactly what the frame shows.
 *
 * The crop happens here, in the browser, and only the result is uploaded:
 * a 512px square for a photo (drawn as a circle everywhere, so the circle is
 * marked over the square), 1500 by 500 for a banner. That also means a phone
 * photo larger than the 4 MB the upload routes accept still goes up, as the
 * small picture it is cropped to.
 *
 * The frame is marked data-sheet-nodrag so a pull down on the photo moves the
 * photo instead of closing the sheet (lib/ui/useDraggableSheet.ts).
 */

/** Larger files are refused before decoding; a phone photo is a few MB. */
export const CROP_MAX_INPUT_BYTES = 25 * 1024 * 1024;

type Loaded = { file: File; url: string; w: number; h: number; img: HTMLImageElement };

export function ImageCropSheet({
  open,
  file,
  shape,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** The picture to place. Kept while the sheet closes, so it slides away whole. */
  file: File | null;
  shape: CropShape;
  onCancel: () => void;
  /** The cropped picture, ready to upload. */
  onConfirm: (cropped: File) => void;
}) {
  const { t } = useTranslate();
  const { aspect, out } = CROP_SHAPES[shape];
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failedFor, setFailedFor] = useState<File | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const current = loaded && loaded.file === file ? loaded : null;
  const failed = file !== null && failedFor === file;
  const tooBig = file !== null && file.size > CROP_MAX_INPUT_BYTES;

  // Decode the chosen file. State is set only from the load callbacks.
  useEffect(() => {
    if (!file || file.size > CROP_MAX_INPUT_BYTES) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    let alive = true;
    img.onload = () => {
      if (!alive) return;
      setLoaded({ file, url, w: img.naturalWidth, h: img.naturalHeight, img });
      setView({ zoom: 1, cx: img.naturalWidth / 2, cy: img.naturalHeight / 2 });
    };
    img.onerror = () => {
      if (alive) setFailedFor(file);
    };
    img.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // The frame's size on screen, which the view is measured against.
  const measure = useCallback((el: HTMLDivElement | null) => {
    frameRef.current = el;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setBox({ w: r.width, h: r.width / aspect });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  const pan = useCallback(
    (dx: number, dy: number) => {
      if (!current || !box) return;
      setView((v) => (v ? panView(v, dx, dy, current, box) : v));
    },
    [current, box],
  );

  /** Zoom, keeping the picture point under (px, py) in the frame where it is. */
  const zoomAt = useCallback(
    (zoom: (z: number) => number, px?: number, py?: number) => {
      if (!current || !box) return;
      setView((v) => (v ? zoomView(v, zoom(v.zoom), current, box, px, py) : v));
    },
    [current, box],
  );

  // Wheel zoom needs a listener that can stop the page from scrolling.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !current) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt((z) => z * factor, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [current, zoomAt]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    if (map.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      map.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pan(dx, dy);
      return;
    }
    // Two fingers: zoom by how far apart they move, around their midpoint.
    const [a, b] = [...map.entries()];
    const other = a[0] === e.pointerId ? b[1] : a[1];
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    map.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (before < 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt((z) => z * (after / before), (e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top);
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      pan(dx, dy);
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAt((z) => z * 1.15);
    } else if (e.key === "-") {
      e.preventDefault();
      zoomAt((z) => z / 1.15);
    }
  }

  async function confirm() {
    if (!current || !box || !view || busy) return;
    setBusy(true);
    try {
      const { sx, sy, sw, sh } = cropRect(view, current, box);
      const canvas = document.createElement("canvas");
      canvas.width = out[0];
      canvas.height = out[1];
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(current.img, sx, sy, sw, sh, 0, 0, out[0], out[1]);
      // A PNG keeps its transparency; anything else becomes a small JPEG.
      const type = file?.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
      if (!blob) throw new Error("no blob");
      onConfirm(new File([blob], type === "image/png" ? `${shape}.png` : `${shape}.jpg`, { type }));
    } catch {
      setFailedFor(file);
    } finally {
      setBusy(false);
    }
  }

  const s = current && box && view ? scaleOf(view.zoom, current, box) : 0;
  const imgStyle =
    current && box && view
      ? {
          width: current.w * s,
          height: current.h * s,
          transform: `translate(${box.w / 2 - view.cx * s}px, ${box.h / 2 - view.cy * s}px)`,
        }
      : undefined;
  const ready = Boolean(current && box && view) && !failed && !tooBig;

  return (
    <Sheet
      open={open && file !== null}
      onClose={onCancel}
      title={shape === "avatar" ? t("profile.cropTitlePhoto") : t("profile.cropTitleBanner")}
      desktop
      openFull
    >
      <div className="space-y-4 pt-1">
        {failed || tooBig ? (
          <p className="rounded-xl border border-paper/10 bg-paper/[0.04] p-4 font-sans text-detail text-paper/75">
            {t("profile.cropFailed")}
          </p>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a 2D position has no native control; arrows and +/- work from the keyboard */}
            <div
              ref={measure}
              data-sheet-nodrag
              role="application"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the photo's position is operated from the keyboard here: arrows move it, plus and minus zoom
              tabIndex={0}
              aria-label={t("profile.cropArea")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onKeyDown={onKeyDown}
              className={cn(
                "relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-paper/60",
                current ? "cursor-grab active:cursor-grabbing" : "",
                shape === "avatar" ? "w-full max-w-[300px]" : "w-full",
              )}
              style={{ aspectRatio: String(aspect) }}
            >
              {current && imgStyle ? (
                // A blob of the reader's own file, drawn at a computed size:
                // next/image has nothing to optimise here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-0 top-0 max-w-none"
                  style={imgStyle}
                />
              ) : null}
              {shape === "avatar" ? (
                // The circle the photo is shown in, everything outside it dimmed.
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ boxShadow: "0 0 0 999px rgb(0 0 0 / 0.55)", outline: "1px solid rgb(255 255 255 / 0.5)" }}
                />
              ) : (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/40" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("profile.zoomOut")}
                onClick={() => zoomAt((z) => z / 1.25)}
                disabled={!ready || (view?.zoom ?? 1) <= 1}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-xl text-paper/70 hover:text-paper disabled:opacity-40"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={view?.zoom ?? 1}
                disabled={!ready}
                aria-label={t("profile.cropZoom")}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  zoomAt(() => z);
                }}
                className="h-11 min-w-0 flex-1 accent-[var(--color-paper)]"
              />
              <button
                type="button"
                aria-label={t("profile.zoomIn")}
                onClick={() => zoomAt((z) => z * 1.25)}
                disabled={!ready || (view?.zoom ?? 1) >= MAX_ZOOM}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-xl text-paper/70 hover:text-paper disabled:opacity-40"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="text-center font-sans text-caption text-paper/50">{t("profile.cropHint")}</p>
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-pill px-5 font-sans text-ui font-medium text-paper/70 hover:text-paper"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!ready || busy}
            className="inline-flex h-11 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-50"
          >
            {shape === "avatar" ? t("profile.cropUsePhoto") : t("profile.cropUseBanner")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
