"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Close } from "@/components/ui/icons/Close";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

/**
 * Photo strip on a review row (product or store) with an in-page viewer.
 * Tapping a thumbnail opens a lightbox: full image against the night
 * backdrop, previous/next across the review's photos (buttons, arrow keys,
 * or a swipe), a counter, Escape/backdrop to close. Zero dependencies,
 * portalled to <body> like the admin Modal so transformed ancestors can't
 * trap the overlay. Images render unoptimized: review photos live in the
 * public shop-media bucket, which the CSP's img-src already allows.
 */
export function ReviewPhotos({ urls }: { urls?: string[] | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const photos = urls ?? [];
  if (photos.length === 0) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {photos.map((u, i) => (
          <button
            key={`${u}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Photo ${i + 1} of ${photos.length}`}
            className="tap-press relative block h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-night-soft/60 transition-[border-color] hover:border-paper/35"
          >
            <Image src={u} alt="" fill sizes="80px" unoptimized className="object-cover" />
          </button>
        ))}
      </div>
      {open != null ? (
        <PhotoLightbox
          photos={photos}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function PhotoLightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const many = photos.length > 1;
  const touchX = useRef<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      onIndex((index + delta + photos.length) % photos.length);
    },
    [index, onIndex, photos.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) step(1);
      else if (e.key === "ArrowLeft" && many) step(-1);
    }
    window.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [onClose, step, many]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-night/95 backdrop-blur-sm"
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null || !many) return;
        const dx = end - start;
        if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="pointer-events-none relative h-[82dvh] w-[min(94vw,1100px)]">
        <Image
          src={photos[index]}
          alt=""
          fill
          sizes="94vw"
          unoptimized
          className="object-contain"
        />
      </div>

      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="tap-press absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 bg-night/70 text-paper/85 hover:border-paper/50 hover:text-paper"
      >
        <Close size={16} />
      </button>

      {many ? (
        <>
          <button
            type="button"
            aria-label={t("shop.previousPhoto")}
            onClick={() => step(-1)}
            className="tap-press absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 bg-night/70 font-sans text-title-sm text-paper/85 hover:border-paper/50 hover:text-paper md:left-6"
          >
            {"‹"}
          </button>
          <button
            type="button"
            aria-label={t("shop.nextPhoto")}
            onClick={() => step(1)}
            className="tap-press absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 bg-night/70 font-sans text-title-sm text-paper/85 hover:border-paper/50 hover:text-paper md:right-6"
          >
            {"›"}
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-pill border border-paper/15 bg-night/70 px-3 py-1 font-sans text-caption tabular-nums text-paper/75">
            {index + 1} {"/"} {photos.length}
          </p>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
