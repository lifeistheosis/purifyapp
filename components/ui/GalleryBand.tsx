import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A gallery band: a wide picture, and on a shade along its start a name and
 * one line on what is inside.
 *
 * The owner's two gallery picks of 2026-10-27 are one pattern, so they are
 * one component. Theology, round 12, A, "A gallery": each subject a wide band
 * with its icon, its name and its line. Discover, round 7b, D, "A gallery":
 * each part of the library a wide band with its picture and the app's line
 * on what is inside, "like Theology". The mockups are
 * Homebase/boards/purify-master/variants/12-theology and 07b-discover.
 *
 * Two sizes, as the two mockups draw them:
 *   tall   150px, the words at the foot, the line whole (Theology's subjects)
 *   short   96px, the words in the middle, the line held to two lines
 *          (Discover's doors)
 *
 * The shade is the page's own ground (`night`), never a literal black, and
 * the words are the page's ink (`paper`), so the band follows every palette:
 * on Parchment it is a wash of paper over the picture with the ink on it.
 *
 * A band is a link (`href`), or the summary of a <details> that opens to
 * what it holds (`summary`, Theology's subjects). Either way it is one tap
 * target the width of the page.
 */
export function GalleryBand({
  picture,
  focus = "50% 30%",
  preview,
  credit,
  title,
  line,
  badge,
  mark,
  size = "short",
  heading = "h2",
  priority = false,
  ...target
}: {
  /** The picture, a path under public/. Drawn for the eye: the name says what it is. */
  picture: string;
  /** Where the crop sits (CSS object-position), for a picture whose faces fall outside the default. */
  focus?: string;
  /** A tiny preview (a data: URL), drawn blurred until the picture has loaded. */
  preview?: string;
  /** The picture's record ("Title · painter, date · licence"), on hover. */
  credit?: string;
  title: ReactNode;
  line: ReactNode;
  /** Set at the top corner of the name (Chat's unread dot). */
  badge?: ReactNode;
  /** Set in the band's far corner (Theology's open-and-close chevron). */
  mark?: ReactNode;
  size?: "tall" | "short";
  heading?: "h2" | "h3";
  /** On the first screen: the picture is asked for at once, not when scrolled to. */
  priority?: boolean;
} & ({ href: string; summary?: never } | { summary: true; href?: never })) {
  const tall = size === "tall";
  const Heading = heading;

  const face = (
    <>
      {preview ? (
        <span
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-md"
          style={{ backgroundImage: `url(${preview})` }}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- a static
          export serves files as they are; next/image would add nothing. */}
      <img
        src={picture}
        alt=""
        title={credit}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: focus }}
      />
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l",
          tall ? "from-night/90 from-35% to-night/15" : "from-night/93 from-40% to-night/12",
        )}
      />
      <span
        className={cn(
          "relative flex h-full flex-col",
          tall ? "w-[62%] justify-end pt-4 pb-3.5" : "w-[66%] justify-center py-3",
        )}
      >
        <Heading className="text-lede leading-[1.15] text-paper">
          {badge ? (
            // Room on the right, where the dot is drawn in either direction.
            <span className="relative inline-block pr-3">
              {title}
              {badge}
            </span>
          ) : (
            title
          )}
        </Heading>
        <span
          className={cn(
            "font-sans text-caption text-paper/70",
            tall ? "mt-1.5 line-clamp-4 leading-[1.4]" : "mt-1 line-clamp-2 leading-[1.38]",
          )}
        >
          {line}
        </span>
      </span>
      {mark ? (
        <span aria-hidden className="absolute end-3 bottom-3">
          {mark}
        </span>
      ) : null}
    </>
  );

  const box = cn(
    "press-card relative block overflow-hidden bg-night-soft ps-4 pe-3",
    tall ? "h-[150px] rounded-[20px]" : "h-24 rounded-[18px]",
  );

  if (target.summary) {
    return (
      <summary className={cn(box, "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>{face}</summary>
    );
  }
  return (
    <Link href={target.href} className={box}>
      {face}
    </Link>
  );
}
