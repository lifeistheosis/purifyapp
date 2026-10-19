"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { GEOMETRY, SIZES, coverWords, type CoverScale, type CoverSize } from "@/lib/reading/coverText";

/**
 * One cover for every book, shared by the reading room (note 18), a saint's
 * Writings (note 19) and the walks: a poster (1.7.1, the owner's note of
 * 2026-10-17: "there's no actual card around the image ... it's simply the
 * image, and it's just like their shadow on the back"). No frame, no ring,
 * no panel for the words: the picture itself, full bleed in its two by three,
 * a soft shadow behind it, and the title set on it, as a film poster's is.
 *
 * THE PICTURE is the icon of the book's saint (lib/reading/coverArt.ts),
 * cut to show his face (`focusY`, where the face is, from the top). A book
 * in print may have its own cover (`imageUrl`), which carries its own title,
 * so it lies over the words instead of under them.
 *
 * THE WORDS sit at the poster's foot, on a fade into black that begins above
 * them, so they read over any icon: the title in Lora, the author under it in
 * small type, centred. Where each line may break and how large each title
 * and author are set is worked out from the words (lib/reading/coverText.ts)
 * and is a part of the poster's own width (it is a size container), so a
 * poster is one design in a row, in the search's grid and held up on a
 * book's page, and every title is whole. A browser without container units
 * (Safari before 16) sets the same sizes in pixels for the narrowest poster
 * of each size, which is what the words were fitted to.
 *
 * A BOOK WITH NO PICTURE (no settled icon of its saint yet) is a poster of
 * its own, never a bare card: black, with a pool of light in its middle, the
 * title larger in that light, and the author at the foot under a short rule.
 *
 * WHILE A PICTURE LOADS the poster is already there, black and lit softly
 * from above, with its words at the foot where they will stay, and the
 * picture fades in under them once it has loaded (on the app's motion
 * switch, `motion-safe:`), so nothing moves when it comes. A picture that
 * fails is asked for once more, quietly; if it fails again, or comes back at
 * one pixel (Amazon answers a missing cover with a 1 by 1 picture and a 200),
 * the poster stays as it is. A picture that loaded or failed before the page
 * woke is read from the <img> itself (as components/saints/SaintHeroPicture.tsx
 * does): the server wrote it, and a phone can answer it before React is awake.
 *
 * LOADING. `priority` is the one cover a screen opens on (eager, and first
 * in line); `eager` is a cover near the screen (a row that is about to be
 * seen, components/reading/CoverRow.tsx), so a row swiped sideways never
 * shows its pictures arriving one by one. Every other cover loads as the
 * page nears it.
 *
 * The cover's words are the link's, so the cover is hidden from assistive
 * technology: a row names its link with the title and the author.
 */
export type { CoverSize };

const WIDTH: Record<CoverSize, string> = {
  sm: "w-[72px]",
  md: "w-[120px]",
  lg: "w-[160px]",
  row: "w-[112px] md:w-[148px]",
  grid: "w-full",
  hero: "w-[188px] md:w-[220px]",
};

/** A poster's corners and the shadow behind it, by scale. */
const POSTER: Record<CoverScale, string> = {
  tiny: "rounded-[4px] shadow-[0_4px_10px_-4px_rgba(0,0,0,0.7)]",
  shelf: "rounded-[6px] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.85)]",
  large: "rounded-[8px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]",
};

/** The ground a picture arrives on: black, lit softly from above. */
const GROUND = "radial-gradient(130% 75% at 50% 0%, rgba(255,255,255,0.14), rgba(255,255,255,0) 72%)";
/** A book with no picture: a pool of light where its title stands, the edges falling away to black. */
const LIT =
  "radial-gradient(85% 55% at 50% 40%, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 55%, rgba(255,255,255,0) 80%), linear-gradient(to bottom, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45))";
/** The fade the words sit on: clear where it begins, eased, as dark as their first line where they start. */
const FADE = "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.56) 80%, rgba(0,0,0,0.72))";
/** And under the words, darker still to the foot. */
const UNDER = "linear-gradient(to bottom, rgba(0,0,0,0.72), rgba(0,0,0,0.88))";

/** How long a failed picture waits before it is asked for once more. */
const RETRY_MS = 2500;

/** A length in hundredths of the poster's width, for a box on it: a percentage of its containing block's width. */
const pct = (n: number) => `${+n.toFixed(3)}%`;

/**
 * A size on the poster: `px` plus `cqw` hundredths of its width, times `fit`.
 * The pixel size for the size's narrowest poster rides along as a variable,
 * the fallback for a browser that drops a length in container units.
 */
function typeSize([px, cqw]: readonly [number, number], fit: number, narrowest: number): CSSProperties {
  return {
    ["--cover-px" as string]: `${+((px + (cqw * narrowest) / 100) * fit).toFixed(2)}px`,
    fontSize: `calc(${+(px * fit).toFixed(3)}px + ${+(cqw * fit).toFixed(3)}cqw)`,
  } as CSSProperties;
}

export function WorkCover({
  title,
  author,
  iconUrl,
  focusY = 22,
  imageUrl,
  size,
  priority = false,
  eager = false,
  className,
}: {
  title: string;
  author?: string;
  /** The icon of the work's saint: a settled picture only (lib/reading/coverArt.ts). */
  iconUrl?: string | null;
  /** Where the face sits in the icon, percent from its top. */
  focusY?: number;
  /** The book's own cover, when there is one the site may show. */
  imageUrl?: string | null;
  size: CoverSize;
  /** The one cover a screen opens on: loaded at once and first. */
  priority?: boolean;
  /** A cover about to be seen: loaded now, not when it is reached. */
  eager?: boolean;
  className?: string;
}) {
  const src = imageUrl || iconUrl || null;
  /** The picture that has loaded, the one given up on, and whether this one is the second asking. */
  const [loaded, setLoaded] = useState<string | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [retry, setRetry] = useState<string | null>(null);
  // A picture that failed once is taken out of the page while it waits to be
  // asked for again, so no broken picture ever sits in the poster, hidden or
  // not (the export walk counts them, and a reader's screen reader would too).
  const [resting, setResting] = useState<string | null>(null);
  const picture = useRef<HTMLImageElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fail = (failed: string) => {
    if (retry === failed) {
      setGone(failed);
      return;
    }
    setResting(failed);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResting(null);
      setRetry(failed);
    }, RETRY_MS);
  };

  // A picture that loaded or failed before the page could listen. One whose
  // loading has not begun (a lazy picture far from the screen) has no
  // currentSrc yet, and is left to load.
  useEffect(() => {
    const img = picture.current;
    if (!img || !src || !img.complete || !img.currentSrc) return;
    if (img.naturalWidth > 1) setLoaded(src);
    else if (img.naturalWidth === 0) fail(src);
    else setGone(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, retry]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const { scale, min } = SIZES[size];
  const g = GEOMETRY[scale];
  const words = coverWords({ title, author, size, picture: src !== null });
  const shown = src !== null && loaded === src;
  // The author's room above him is a part of the words' width, which is the
  // poster's less its two side paddings.
  const gap = g.gap / ((100 - 2 * g.padX) / 100);

  const image =
    src && gone !== src && resting !== src ? (
      // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are, and another site's picture is shown as it is.
      <img
        key={retry === src ? `${src}#again` : src}
        ref={picture}
        src={src}
        alt=""
        loading={priority || eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 1) setGone(src);
          else setLoaded(src);
        }}
        onError={() => fail(src)}
        data-cover-picture={shown ? "shown" : "waiting"}
        className={cn(
          "absolute inset-0 h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={imageUrl ? undefined : { objectPosition: `50% ${focusY}%` }}
      />
    ) : null;

  const box = cn("dark-island @container relative aspect-[2/3] shrink-0 overflow-hidden bg-night-soft", POSTER[scale], WIDTH[size], className);
  const titleStyle: CSSProperties = {
    ...typeSize(g.title, words.titleFit * (src ? 1 : g.alone), min),
    lineHeight: g.titleLead,
    ...(words.clamp === null ? {} : { display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: words.clamp, overflow: "hidden" as const }),
  };
  const authorStyle: CSSProperties = { ...(g.author ? typeSize(g.author, words.authorFit, min) : {}), lineHeight: g.authorLead };

  if (!src) {
    return (
      <div aria-hidden data-cover="" className={box} style={{ backgroundImage: LIT }}>
        <span
          data-cover-words=""
          className="absolute inset-0 flex flex-col items-center text-center"
          style={{ padding: `${pct(g.aloneTop)} ${pct(g.padX)} ${pct(g.foot)}` }}
        >
          <span className="flex min-h-0 w-full flex-1 items-center justify-center">
            <span data-cover-title="" className="font-serif text-[length:var(--cover-px)] font-semibold text-balance text-paper" style={titleStyle}>
              {words.title}
            </span>
          </span>
          {words.author && g.author ? (
            <>
              <span aria-hidden className="block h-px w-[18%] shrink-0 bg-paper/35" style={{ margin: `${pct(g.rule / 2)} 0` }} />
              <span data-cover-author="" className="font-sans text-[length:var(--cover-px)] font-medium text-balance text-paper/80" style={authorStyle}>
                {words.author}
              </span>
            </>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <div aria-hidden data-cover="" className={box} style={{ backgroundImage: GROUND }}>
      {imageUrl ? null : image}
      <span data-cover-words="" className="absolute inset-x-0 bottom-0 flex flex-col">
        <span aria-hidden className="block" style={{ paddingTop: pct(g.fade), backgroundImage: FADE }} />
        <span
          className="flex flex-col items-center text-center"
          style={{ padding: `0 ${pct(g.padX)} ${pct(g.foot)}`, backgroundImage: UNDER }}
        >
          <span
            data-cover-title=""
            className="font-serif text-[length:var(--cover-px)] font-semibold text-balance text-paper [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
            style={titleStyle}
          >
            {words.title}
          </span>
          {words.author && g.author ? (
            <span
              data-cover-author=""
              className="font-sans text-[length:var(--cover-px)] font-medium text-balance text-paper/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
              style={{ ...authorStyle, marginTop: pct(gap) }}
            >
              {words.author}
            </span>
          ) : null}
        </span>
      </span>
      {imageUrl ? image : null}
    </div>
  );
}
