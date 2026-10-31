"use client";

import { useCallback, useLayoutEffect, useRef, type SyntheticEvent } from "react";

/** The longest a loaded picture waits on its decode before it is shown anyway. */
const DECODE_WAIT_MS = 1500;

/**
 * A picture that arrives whole: the app's one rule for a picture that comes
 * over the network (build 81, the owner's photos of the mini player's cover
 * and a work's byline icon, "the photos that load in here load in
 * spiratically"; build 85, note 52, the prayer wall's faces, "they load in
 * half and then the other half"). It is the rule History's plates have kept
 * since 1.7.2 (components/history/EventPlate.tsx), shared.
 *
 * A browser paints a picture as its bytes arrive, a band at a time from the
 * top. So the picture is drawn as nothing until every byte is in AND it is
 * decoded, and then it fades in, whole (`.img-arrive` in app/globals.css, on
 * the app's motion switch; with motion off it simply appears). A decode the
 * browser never answers holds a loaded picture back for DECODE_WAIT_MS at
 * most. What stands under it in the meantime (an avatar's initials, a plate,
 * a blurred preview) is the placeholder, and its box never changes size.
 *
 * It is unseen from the server's page on: `.img-arrive` hides whatever lacks
 * `data-arrived`, and only script gives that mark, so even the website's
 * first paint, before the page wakes, never shows a band. A picture drawn
 * after the page woke is looked at before it is first painted: one the
 * browser already holds (the same face on the next screen) is marked at once
 * and shown with no fade.
 *
 * One that finished before the page could listen (the website's first
 * paint, its load or its error unheard) is read from the <img> itself: shown
 * if it has its pixels, else asked to decode, which only a picture that has
 * them answers; a broken one is handed to `onBroken`, so the caller can stand
 * its fallback in, as its onError would.
 *
 * The mark is set on the element itself, not through React state, so nothing
 * renders twice for it. A new element (a key that changed) or a new address
 * is looked at afresh; the same one is left alone.
 *
 * Use: `const { ref, onArrive } = useArrivingImage(src)`, then
 * `<img ref={ref} onLoad={onArrive} className="img-arrive ..." />` (a
 * next/image takes the same ref and onLoad). lib/ui/__tests__/arrivingImage.test.ts
 * holds every picture that uses it.
 */
export function useArrivingImage(src: string | null, onBroken?: (img: HTMLImageElement) => void) {
  const ref = useRef<HTMLImageElement | null>(null);
  const seen = useRef<{ img: HTMLImageElement | null; src: string | null }>({ img: null, src: null });

  // After every render, before the browser paints: cheap, and it is how a
  // new element made under the same address is still looked at.
  useLayoutEffect(() => {
    const img = ref.current;
    if (!img || (seen.current.img === img && seen.current.src === src)) return;
    seen.current = { img, src };
    if (img.complete && img.naturalWidth > 0) {
      img.dataset.arrived = "";
      return;
    }
    delete img.dataset.arrived;
    if (img.complete && img.currentSrc) {
      const asked = img.currentSrc;
      decoded(img).then(
        () => show(img, asked),
        () => {
          if (img.currentSrc === asked) onBroken?.(img);
        },
      );
    }
  });

  const onArrive = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const loaded = img.currentSrc || img.src;
    // Shown once it is decoded too, so it never paints in bands; and shown
    // all the same if the browser never answers, since every byte is in.
    const done = () => show(img, loaded);
    decoded(img).then(done, done);
    window.setTimeout(done, DECODE_WAIT_MS);
  }, []);

  return { ref, onArrive };
}

/** The picture decoded, where the browser can say so. */
function decoded(img: HTMLImageElement): Promise<void> {
  return typeof img.decode === "function" ? img.decode() : Promise.resolve();
}

/** Show the picture, if the element still holds the one that loaded. */
function show(img: HTMLImageElement, loaded: string) {
  if ((img.currentSrc || img.src) === loaded) img.dataset.arrived = "";
}
