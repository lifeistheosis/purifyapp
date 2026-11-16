import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { ShelfCover } from "@/lib/chants/shelf";
import { cn } from "@/lib/cn";

import { ChantCover } from "./ChantCover";

/**
 * The chants door on Prayers (1.9, build 98 note 3). His words, of the play
 * band that stood here (a white disc with a play mark): "I wanted this design
 * revamped it doesn't fit its purpose". The disc promised playing and a tap
 * played nothing: it opens the library.
 *
 * So the door is drawn as what it is, the way into the library of sung
 * prayer, and shows what is inside it:
 *
 *   the shelf   the chants' own covers, the ones their tiles wear in the
 *               library (lib/chants/shelf.ts), the Prayer Rope Anthem first,
 *               in one row that runs off the card's end side: the card cuts
 *               it, so it reads as a shelf with more on it. Not a scroller.
 *               The covers are decoration; the card is the one link.
 *   the words   "Sung prayer" in the house's small line, "Chants" in the
 *               serif, its one line, and the chevron of a door that opens.
 *
 * No play mark, no disc and no gradient band. The card is the house's raised
 * tray (.theology-tray), which follows every palette. Its first cover travels
 * into the library's first tile when that tile wears the same picture
 * (data-carry, lib/ui/routeMotion.ts; components/chants/ChantsHome.tsx takes
 * it); on a day the library opens on another chant, nothing travels.
 *
 * Each cover is a share of the shelf's width, so at every width three stand
 * whole and the fourth is cut by the card's end.
 */
export function ChantsDoor({ covers, className }: { covers: readonly ShelfCover[]; className?: string }) {
  return (
    <Link
      href="/chants"
      data-chants-door=""
      className={cn("theology-tray press-card group flex flex-col overflow-hidden rounded-[28px] pb-4 ps-4 pt-4", className)}
    >
      {covers.length > 0 ? (
        <span aria-hidden data-chants-shelf="" className="flex gap-2.5">
          {covers.map((c, i) => (
            <ChantCover
              key={c.slug}
              cover={{ src: c.src, alt: "" }}
              size="thumb"
              carry={i === 0 ? c.src : undefined}
              className="w-[26%] shrink-0 rounded-[12px]"
            />
          ))}
        </span>
      ) : null}
      <span className={cn("flex items-center gap-3 pe-4", covers.length > 0 && "mt-auto pt-4")}>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-caption font-semibold text-paper/55">
            <T k="chants.door.kicker" />
          </span>
          <span role="heading" aria-level={3} className="mt-1 block font-serif text-title-sm leading-[1.15] text-paper">
            <T k="chants.title" />
          </span>
          <span className="mt-1.5 block font-sans text-caption leading-[1.5] text-paper/65">
            <T k="chants.door.sub" />
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
      </span>
    </Link>
  );
}
