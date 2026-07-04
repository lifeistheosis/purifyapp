"use client";

// The Immersive account hero: the event's rights-verified artwork as a
// slideshow with the slow Ken Burns push, scroll parallax, per-image
// attribution, and the fixed era atmosphere behind the page.
//
// Rendered ONLY for entitled readers (plusFeatures, the ambience pattern)
// who have not switched Immersive History off; free readers receive
// nothing, not even layout space, matching the timeline's gating. Sacred-
// image rules hold here as everywhere: slow pan and zoom only, no figure
// animation. Reduced motion gets a still image, no crossfade, no drift;
// the dots remain so every image is still reachable.

import { useEffect, useMemo, useState } from "react";

import { getClientEntitlements } from "@/lib/entitlements/client";
import type { HistoryEventMeta } from "@/lib/history/events";
import { cn } from "@/lib/cn";

type Slide = {
  src: string;
  alt: string;
  work: string;
  artist: string;
  license: string;
};

export function EventHero({ meta }: { meta: HistoryEventMeta }) {
  const media = meta.media;
  const [on, setOn] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [idx, setIdx] = useState(0);

  // Same entitlement + preference gate as the timeline's Immersive toggle.
  /* eslint-disable react-hooks/set-state-in-effect -- client-only state
     (entitlements, media query) can't be read during SSR; same pattern as
     HistoryTimelinePage. */
  useEffect(() => {
    let alive = true;
    getClientEntitlements()
      .then((e) => {
        if (!alive || !e.plusFeatures) return;
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("purify.history.cinematic");
        } catch {
          /* ignore */
        }
        setOn(saved !== "off");
      })
      .catch(() => {
        /* entitlement lookup must never break the account page */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const slides = useMemo<Slide[]>(() => {
    if (!media) return [];
    return [
      { src: media.hero, alt: media.alt, work: media.work, artist: media.artist, license: media.license },
      ...(media.gallery ?? []).map((g) => ({
        src: g.src,
        alt: g.alt,
        work: g.work,
        artist: g.artist,
        license: g.license,
      })),
    ];
  }, [media]);

  // The slideshow: a contemplative 9s per image, crossfaded in CSS.
  useEffect(() => {
    if (!on || reduced || slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 9000);
    return () => clearInterval(t);
  }, [on, reduced, slides.length]);

  if (!media || !on || slides.length === 0) return null;
  const current = slides[Math.min(idx, slides.length - 1)];

  return (
    <>
      {/* Fixed drifting era light behind the whole account. */}
      <div aria-hidden className="account-atmosphere" />

      <figure
        className={cn(
          "relative -mx-5 mb-10 overflow-hidden bg-night-soft md:mx-0 md:rounded-lg",
          meta.importance === 1 ? "h-[44vh] md:h-[52vh]" : "h-[32vh] md:h-[42vh]",
        )}
      >
        {/* Parallax layer, 120% tall so the slower slide never uncovers. */}
        <div className="account-parallax absolute inset-x-0 bottom-0 top-[-20%]">
          {slides.map((s, i) => (
            /* eslint-disable-next-line @next/next/no-img-element -- bundled
               asset in a static-export (Android) route; next/image's
               optimizer is unavailable there. */
            <img
              key={s.src}
              src={s.src}
              alt={i === idx ? s.alt : ""}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              data-active={i === idx}
              className={cn(
                "account-slide absolute inset-0 h-full w-full object-cover",
                !reduced && "cinema-kenburns",
              )}
            />
          ))}
        </div>

        {/* Scrim so the masthead below never fights the artwork. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-night via-night/25 to-night/15"
        />

        <figcaption className="absolute bottom-2.5 right-4 max-w-[70%] truncate text-right font-sans text-[10px] leading-tight text-paper/75">
          {current.work} · {current.artist} · {current.license}
        </figcaption>

        {slides.length > 1 ? (
          <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Show image ${i + 1} of ${slides.length}: ${s.work}`}
                aria-current={i === idx}
                className={cn(
                  "h-[9px] w-[9px] rounded-full border transition-colors",
                  i === idx
                    ? "border-paper/80 bg-paper/80"
                    : "border-paper/50 bg-transparent hover:bg-paper/30",
                )}
              />
            ))}
          </div>
        ) : null}
      </figure>
    </>
  );
}
