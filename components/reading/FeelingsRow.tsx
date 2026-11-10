"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { HOLD_MS } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { avifFor } from "@/lib/media/streamed";
import { emWidth } from "@/lib/reading/coverText";
import { collectionHref, collectionNameKey, type FeelingDoor } from "@/lib/reading/feelings";

import { CoverRow, useRowNear } from "./CoverRow";
import styles from "./room.module.css";

/** Where each door's pool of light sits across it, in turn, so no two neighbours are lit alike. */
const LIGHT = ["40%", "60%", "48%", "36%", "64%"];

/** The fade a door's words sit on over its icon: clear where it begins, as dark as a cover's at the foot. */
const FADE = "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.62) 62%, rgba(0,0,0,0.85))";

const ARRIVE = "motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-[var(--ease-house)]";

/**
 * The feeling's name at the door's size (23px, 26px on a wider screen), or
 * smaller for a long word, so it stands whole inside the door's padding:
 * "Despondency" at 19px, "Pagdadalamhati" at 16px (Lora's own widths,
 * lib/reading/coverText.ts). A word too long even at the smallest
 * (Niedergeschlagenheit) is hyphenated where the language allows, else
 * broken, never cut off at the door's edge.
 */
function nameSize(name: string): CSSProperties {
  const longest = Math.max(...name.split(/\s+/).map((word) => emWidth(word, "serif")));
  const at = (most: number, room: number) => `${+Math.max(13, Math.min(most, room / (longest * 1.04))).toFixed(1)}px`;
  return { "--door-name": at(23, 126), "--door-name-md": at(26, 172) } as CSSProperties;
}
const NAME =
  "font-serif font-semibold leading-[1.1] text-paper text-balance hyphens-auto [overflow-wrap:anywhere] [font-size:var(--door-name)] md:[font-size:var(--door-name-md)]";

/**
 * The row by feeling (1.8, the owner's note of 2026-10-17: "a section for
 * emotions"): a door for each feeling the library can answer, opening its
 * Purify collection (lib/reading/feelings.ts). The whole door is the link,
 * named by its words.
 *
 * 1.9, build 89 note 3 ("an icon attributed to a saint that is also
 * attributed to that specific emotion"): each door carries the icon of its
 * saint (lib/reading/authorCovers.ts, FEELING_COVERS), four wide by five
 * tall as the icons are cut, the feeling's name in Lora and how many
 * passages wait behind it at its foot, on a fade, as a cover's title is. The
 * icon lives on the website, so a door waits for it as the room's covers do
 * (components/covers/WorkCover.tsx, `hold`): unseen in the page's own colour
 * until its icon is in, then whole. An icon that cannot come (no signal in
 * the apps) leaves the door as it was before it had one: black, a pool of
 * light where the name stands, a short rule and the count; and an icon that
 * comes after that fades in over it.
 */
export function FeelingsRow({ doors, className }: { doors: FeelingDoor[]; className?: string }) {
  const { t } = useTranslate();
  if (doors.length === 0) return null;
  return (
    <CoverRow id="feelings" title={t("reading.row.feelings")} className={className}>
      {doors.map((door, i) => (
        <Door key={door.slug} door={door} light={LIGHT[i % LIGHT.length]} />
      ))}
    </CoverRow>
  );
}

function Door({ door, light }: { door: FeelingDoor; light: string }) {
  const { t, tn } = useTranslate();
  const near = useRowNear();
  const src = door.cover?.src ?? null;
  const avif = avifFor(src);
  /** The icon in and decoded; given up on; asked for as JPEG after its AVIF failed; shown bare after the wait. */
  const [loaded, setLoaded] = useState(false);
  const [gone, setGone] = useState(false);
  const [jpegOnly, setJpegOnly] = useState(false);
  const [bare, setBare] = useState(false);
  const picture = useRef<HTMLImageElement>(null);

  const name = t(collectionNameKey(door.slug));
  const count = tn("reading.collection.passages", door.count);
  const size = nameSize(name);

  // An icon that loaded or failed before the page could listen.
  useEffect(() => {
    const img = picture.current;
    if (!img || !img.complete || !img.currentSrc) return;
    if (img.naturalWidth > 1) setLoaded(true);
    else if (avif && !jpegOnly && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
    else setGone(true);
  }, [avif, jpegOnly]);

  // A slow icon lets the door show without it, once its row is near.
  const arrived = src === null || loaded || gone || bare;
  useEffect(() => {
    if (!near || arrived) return;
    const wait = setTimeout(() => setBare(true), HOLD_MS);
    return () => clearTimeout(wait);
  }, [near, arrived]);

  return (
    <li className="w-[150px] md:w-[196px]">
      <Link href={collectionHref(door.slug)} prefetch={false} className="press-card group block rounded-[8px]">
        <span
          data-feeling={door.slug}
          data-door-icon={src ? (loaded ? "shown" : "waiting") : undefined}
          className={cn(
            "dark-island relative block aspect-[4/5] overflow-hidden rounded-[8px] bg-night shadow-[0_12px_24px_-12px_rgba(0,0,0,0.85)]",
            src && ARRIVE,
            !arrived && "opacity-0",
          )}
        >
          {/* The door as it stands with no icon: also its words for a screen reader, whichever shows. */}
          <span
            className={cn(styles.door, "absolute inset-0 flex flex-col items-center justify-center px-3 text-center", ARRIVE, loaded && "opacity-0")}
            style={{ "--door-light": light } as CSSProperties}
          >
            <span className={NAME} style={size}>
              {name}
            </span>
            <span aria-hidden className="mt-2.5 block h-px w-6 shrink-0 bg-paper/30" />
            <span className="mt-2 font-sans text-caption text-paper/60">{count}</span>
          </span>
          {src && !gone ? (
            <span aria-hidden className={cn("absolute inset-0", ARRIVE, loaded ? "opacity-100" : "opacity-0")}>
              <picture className="contents">
                {avif && !jpegOnly ? <source type="image/avif" srcSet={avif} /> : null}
                <img
                  key={jpegOnly ? `${src}#jpeg` : src}
                  ref={picture}
                  src={src}
                  alt=""
                  loading={near ? "eager" : "lazy"}
                  decoding="async"
                  onLoad={(e) => {
                    if (e.currentTarget.naturalWidth <= 1) {
                      setGone(true);
                      return;
                    }
                    // Shown once it is decoded too, so it never paints in bands.
                    const done = () => setLoaded(true);
                    e.currentTarget.decode().then(done, done);
                  }}
                  onError={(e) => {
                    if (avif && !jpegOnly && e.currentTarget.currentSrc.endsWith(".avif")) setJpegOnly(true);
                    else setGone(true);
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-center px-3 pb-3.5 pt-12 text-center" style={{ backgroundImage: FADE }}>
                <span className={cn(NAME, "[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]")} style={size}>
                  {name}
                </span>
                <span className="mt-1.5 font-sans text-caption text-paper/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{count}</span>
              </span>
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
