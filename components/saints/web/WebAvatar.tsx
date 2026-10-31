"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { iconFace } from "@/lib/saints/iconFaces";
import type { WebNode } from "@/lib/saints/webLayout";

/**
 * A saint or a council on the saint web (1.8): the saint's icon in a circle,
 * or his initial in Lora where the app carries no icon of him; a council as a
 * rounded square with its number in the seven. Decorative: the name beside it
 * says who it is.
 *
 * The icon is cut where his face is (lib/saints/iconFaces.ts): 20% from the
 * top for a head and shoulders, nearer the top for a standing figure, so St
 * John Chrysostom's circle shows his face and not his chest (round 3, r3-06).
 * It never starts a picture drag of its own: on the web a mouse moves the
 * saint, not his icon.
 */
export function WebAvatar({ node, size, className }: { node: WebNode; size: number; className?: string }) {
  if (node.kind === "council") {
    return (
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center border border-paper/15 bg-night-soft font-serif font-bold leading-none text-paper",
          className,
        )}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), fontSize: Math.round(size * 0.36) }}
      >
        {node.mark}
      </span>
    );
  }
  const { icon, initial } = node.person;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-night-soft",
        icon ? "" : "border border-paper/15 font-serif font-semibold leading-none text-paper/60",
        className,
      )}
      style={{ width: size, height: size, fontSize: icon ? undefined : Math.round(size * 0.38) }}
    >
      {/* One picture per address: another saint's icon is another picture, waited for in its turn. */}
      {icon ? <WebIcon key={icon} src={icon} /> : initial}
    </span>
  );
}

/**
 * Pictures already whole on this visit. The web draws the same icon again and
 * again (a saint chosen, his card, its handle, the glide of note 55 bringing
 * him to the middle), each a new picture element; one whose picture is in
 * hand shows it at once instead of waiting for it all over again.
 */
const WHOLE = new Set<string>();

/**
 * The icon itself, under the build 85 note 52: a picture never paints in
 * halves. It stays unseen until every byte is in and decoded (`onLoad`, then
 * `decode()`), then fades in on the app's motion switch, as
 * components/history/EventPlate.tsx does, over the circle's own ground. A
 * picture that finished before the page could listen (the website's first
 * paint, or one the browser already holds) is read from the element before
 * the first paint, and shown as it is.
 */
function WebIcon({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);
  // "kept": whole before it was drawn here, so simply there; "faded": it arrived while the circle waited.
  const [shown, setShown] = useState<"waiting" | "kept" | "faded">(() => (WHOLE.has(src) ? "kept" : "waiting"));

  useLayoutEffect(() => {
    const img = ref.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;
    WHOLE.add(src);
    // Read once, before the first paint, so a picture already whole never blinks.
    setShown((s) => (s === "waiting" ? "kept" : s));
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is.
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={(e) => {
        // Shown once it is decoded too, so it never paints in bands.
        const done = () => {
          WHOLE.add(src);
          setShown((s) => (s === "waiting" ? "faded" : s));
        };
        e.currentTarget.decode().then(done, done);
      }}
      className={cn(
        "h-full w-full object-cover",
        shown === "waiting" ? "opacity-0" : "opacity-100",
        shown === "faded" && "motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-house",
      )}
      style={{ objectPosition: `50% ${iconFace(src)}%` }}
    />
  );
}
