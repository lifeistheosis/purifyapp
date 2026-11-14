import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { BandPicture } from "./BandPicture";

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
 * The clamp is a guard, not room: a line it cuts ends in "...", and a name
 * that takes two lines squeezes the line under it to one. So each line is
 * written to fit whole on a 360px phone in every language (the owner's
 * build 86 note 76), and scripts/export-walk.mjs, section 45, measures
 * Discover's lines on the built app.
 *
 * The shade is the page's own ground (`night`), never a literal black, and
 * the words are the page's ink (`paper`), so the band follows every palette:
 * on Parchment it is a wash of paper over the picture with the ink on it.
 *
 * The shade is the ground itself, laid under the picture, and the picture is
 * faded into it by a mask (.band-picture in globals.css), not darkened by a
 * layer laid over it. The band clips each of its layers to its round corners
 * on its own, so where the curve only partly covers a pixel, a dark layer over
 * the picture covered only part of what the picture put there, and a thin
 * bright line of the picture showed round the two start corners, the one
 * place the shade is dark enough to tell (the owner's build 80 note 1, "a
 * thin sliver shows with no shadow, as if trimmed off"). Faded before it is
 * clipped, the picture shows nowhere more than the shade lets it, to the
 * very edge.
 *
 * A band is a link (`href`), or the summary of a <details> that opens to
 * what it holds (`summary`, Theology's subjects). Either way it is one tap
 * target the width of the page.
 *
 * A tall band may carry a `kicker` at its top, apart from the name at its
 * foot (1.8, the Ecumenical Councils, the owner's pick of r3-03: each of the
 * seven a band with its numeral and its year above, "like Theology and
 * Discover"). The line under the name then keeps to two lines, so the name
 * never climbs into the kicker.
 */
export function GalleryBand({
  picture,
  avif,
  focus = "50% 30%",
  preview,
  credit,
  title,
  line,
  kicker,
  badge,
  mark,
  size = "short",
  heading = "h2",
  priority = false,
  carry,
  ...target
}: {
  /** The picture, a path under public/. Drawn for the eye: the name says what it is. */
  picture: string;
  /** The same picture as AVIF, offered first, the JPEG behind it (a council's, carried in the apps). */
  avif?: string;
  /** Where the crop sits (CSS object-position), for a picture whose faces fall outside the default. */
  focus?: string;
  /** A tiny preview (a data: URL), drawn blurred until the picture has loaded. */
  preview?: string;
  /** The picture's record ("Title · painter, date · licence"), on hover. */
  credit?: string;
  title: ReactNode;
  line: ReactNode;
  /** Set at the top of a tall band, apart from the name at its foot (a council's numeral and year). */
  kicker?: ReactNode;
  /** Set at the top corner of the name (Chat's unread dot). */
  badge?: ReactNode;
  /** Set in the band's far corner (Theology's open-and-close chevron). */
  mark?: ReactNode;
  size?: "tall" | "short";
  heading?: "h2" | "h3";
  /** On the first screen: the picture is asked for at once, not when scrolled to. */
  priority?: boolean;
  /** The band's picture travels into the page it opens, where that page's head takes it (lib/ui/routeMotion.ts). */
  carry?: string;
} & ({ href: string; summary?: never } | { summary: true; href?: never })) {
  const tall = size === "tall";
  const Heading = heading;

  const face = (
    <>
      {/* The shade's own colour, the page's ground, under everything. */}
      <span aria-hidden className="absolute inset-0 bg-night" />
      {/* The picture as one layer: the card's grey (what shows before the
          picture comes), the preview and the picture, faded along the start
          by the shade's own figures as a mask; gone whole if the picture
          does not come (./BandPicture.tsx). */}
      <BandPicture picture={picture} avif={avif} preview={preview} credit={credit} focus={focus} tall={tall} priority={priority} carry={carry} />
      <span
        data-carry-over={carry ? "" : undefined}
        className={cn(
          "relative flex h-full flex-col",
          tall ? "w-[62%] justify-end pt-4 pb-3.5" : "w-[66%] justify-center py-3",
        )}
      >
        {tall && kicker ? <span className="mb-auto">{kicker}</span> : null}
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
            "words-halo font-sans text-caption text-paper/80",
            tall ? cn("mt-1.5 leading-[1.4]", kicker ? "line-clamp-2" : "line-clamp-4") : "mt-1 line-clamp-2 leading-[1.38]",
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

  // No colour of its own: the band's colours are all in its layers, so
  // nothing lighter than the shade lies under its edge, and the tint a press
  // gives it (.press-card) stays hidden under the ground, as it was under the
  // picture.
  const box = cn(
    "press-card relative block overflow-hidden ps-4 pe-3",
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
