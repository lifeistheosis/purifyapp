"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { CrossPlate } from "@/components/ui/CrossPlate";
import { keepCover, keptCover } from "@/lib/chants/keptCovers";
import { chantMediaUrl, isStreamed } from "@/lib/chants/media";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/useMounted";

// On the server there is no picture to read, and useLayoutEffect only warns
// (the same choice components/nav/ScrollResetBridge.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A chant's cover (1.7): its public-domain icon, square, or with no picture
 * (or none reachable: a streamed cover with no signal) the plate. One cover
 * for every chant, so a row of them reads as one set, and never a drawn
 * ornament or a made picture standing in for an icon (the owner's notes on
 * the generic AI look, 2026-10-16). No colour is washed out of the icon.
 *
 * 1.8: the plate is the dark ground with the three-bar cross glowing white,
 * and on a hero or a card the chant's languages under it, in their own
 * scripts (components/ui/CrossPlate.tsx). Until then it was the chant's name
 * on the bare ground, and a thumb was an empty square; the coordinator's walk
 * of 2026-10-30 found the Chants home opening on a blank grey box. The name
 * is written beside or under every cover, so the plate does not repeat it.
 * Since the owner's note 57 (2026-10-31) every chant has its icon, and the
 * plate is for a cover that cannot be reached.
 */
export function ChantCover({
  cover,
  languages,
  size,
  picture,
  className,
}: {
  cover?: { src: string; alt: string };
  /** The versions' names in their own scripts ("English", "العربية"), for the plate. */
  languages?: string[];
  /** The plate's lettering: large on a hero, small on a card, none on a thumb. */
  size: "hero" | "card" | "thumb";
  /** Where the icon is held in its box (an object-position class): a little above its middle unless told. */
  picture?: string;
  /** The box's own classes, which win over its ground and its ring. */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  const mounted = useMounted();
  const box = "relative aspect-square overflow-hidden";
  // A streamed cover's address is the website's in the apps and the page's
  // own on the web, which only the device knows: it is drawn once mounted,
  // so the page's first markup (the plate) is the same everywhere.
  const ready = cover && (!isStreamed(cover.src) || mounted);

  if (cover && ready && !failed) {
    const src = chantMediaUrl(cover.src);
    return (
      <div data-cover="img" className={cn(box, "bg-night-soft ring-1 ring-inset ring-paper/10", className)}>
        <CoverPicture key={src} src={src} alt={cover.alt} eager={size === "hero"} picture={picture} onFail={fail} />
      </div>
    );
  }

  return <CrossPlate size={size} caption={languages?.length ? languages.join(" · ") : undefined} className={cn(box, className)} />;
}

/**
 * The icon itself, never shown half arrived (the owner's note 52, the rule
 * components/history/EventPlate.tsx keeps): unseen until every byte is in
 * and decoded, then faded in on the app's motion (with it off, it simply
 * appears), over the box's own dark ground.
 *
 * A cover already shown in this visit is drawn from its kept copy instead
 * (lib/chants/keptCovers.ts), whole in the first frame and with no fade, so
 * going back to Chants from a chant brings its covers back as they were
 * (the owner's note 58).
 */
function CoverPicture({
  src,
  alt,
  eager,
  picture,
  onFail,
}: {
  src: string;
  alt: string;
  eager: boolean;
  picture?: string;
  onFail: () => void;
}) {
  const ref = useRef<HTMLImageElement>(null);
  // Read once, as the picture is first drawn: its kept copy, or none yet.
  const [kept] = useState(() => keptCover(src));
  const [arrived, setArrived] = useState(kept !== null);

  // Shown once it is decoded too, so it never paints in bands; and kept.
  const arrive = useCallback(
    (img: HTMLImageElement) => {
      const done = () => {
        setArrived(true);
        void keepCover(src);
      };
      img.decode().then(done, done);
    },
    [src],
  );

  // A picture that loaded or failed before the page could listen (the
  // website's first paint, or one the browser already had) is read from the
  // <img> itself, before the frame is painted.
  useIsoLayoutEffect(() => {
    const img = ref.current;
    if (kept !== null || !img || !img.complete) return;
    if (img.naturalWidth === 0) onFail();
    else arrive(img);
  }, [arrive, kept, onFail]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
    <img
      ref={ref}
      src={kept ?? src}
      alt={alt}
      loading={eager || kept !== null ? "eager" : "lazy"}
      decoding={kept !== null ? "sync" : "async"}
      onLoad={(e) => {
        if (!arrived) arrive(e.currentTarget);
      }}
      onError={onFail}
      className={cn(
        "absolute inset-0 h-full w-full object-cover object-[50%_20%]",
        picture,
        kept === null && "motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-house",
        arrived ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

/** A chant's versions' names, each once, in the chant's order: the plate's line. */
export function languagesOf(variants: { label: string }[]): string[] {
  return [...new Set(variants.map((v) => v.label))];
}
