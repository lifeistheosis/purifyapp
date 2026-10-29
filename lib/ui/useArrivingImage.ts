"use client";

import { useCallback, useLayoutEffect, useRef, type SyntheticEvent } from "react";

/**
 * A small picture that arrives instead of popping in (build 81, the owner's
 * photos of the mini player's cover and a work's byline icon: "the photos
 * that load in here load in spiratically and not smoothly").
 *
 * Before the first paint, a picture the browser does not have yet is marked
 * `data-arriving`, which `.img-arrive` in app/globals.css draws as nothing;
 * when it loads the mark goes and the picture fades in. One the browser
 * already has (the same cover on the next screen) is shown at once, with no
 * fade. The mark is set on the element itself, not through React state, so
 * nothing renders twice; and it is set only by script, so the server's page,
 * or a browser running none, shows the picture as it always did.
 */
export function useArrivingImage(src: string | null) {
  const ref = useRef<HTMLImageElement | null>(null);

  useLayoutEffect(() => {
    const img = ref.current;
    if (!img || !src) return;
    if (img.complete && img.naturalWidth > 0) delete img.dataset.arriving;
    else img.dataset.arriving = "";
  }, [src]);

  const onArrive = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    delete e.currentTarget.dataset.arriving;
  }, []);

  return { ref, onArrive };
}
