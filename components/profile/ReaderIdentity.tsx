"use client";

// Who the reader is, as one piece, the same on You and on Profile (1.9,
// build 98 note 11; the owner, 2026-11-15, with a photo of each: "can your
// revamp the your profile screen"). The two were drawn apart: You had the
// picture, the name, "Your profile" and the badges on the Ladder; Profile had
// the picture again, larger and centred, the name, and under it the address
// the reader signs in with, on a screen people photograph and share. The
// patron saint was a form further down, and the badges were not there at all.
//
// So one piece, in one shape, on both:
//
//   the reader's picture, the name in the reading serif, and under the name
//   their patron saint as one quiet line, led by the saint's own small round
//   picture; then their badges on the round plates, only those earned (none
//   earned draws nothing, never empty rings).
//
// On You the whole of it is the way into Profile, with one chevron (`end`);
// on Profile it stands at the top with Edit as its one quiet button. A tap
// carries the picture across with the page (lib/ui/routeMotion.ts,
// data-carry), and the name with it (app/globals.css, "The reader's name
// travels with their picture"). The sign-in address is the account's, and is
// listed with the account (components/profile/AccountFacts.tsx).
//
// Drawn in spans, so the whole of it can stand inside a link.

import type { CSSProperties, ReactNode } from "react";

import { Medal } from "@/components/community/profile/ProfileBadges";
import { SupporterMark } from "@/components/community/SupporterMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { cn } from "@/lib/cn";
import type { BadgeId } from "@/lib/profile/badges";
import { patronFor } from "@/lib/profile/patrons";

/** The name and the line under it, on the page's own ground. */
export const NAME_ON_PAGE = "block break-words font-heading text-[30px] font-bold leading-[1.15] tracking-[-0.01em] text-paper";
export const LINE_ON_PAGE = "mt-1 flex items-center gap-1.5 font-sans text-detail text-paper/70";

/** The Pro cross draws its ring in the crimson token: beside a reader's own name it is the ink. */
const INK = { "--color-crimson": "var(--color-paper)" } as CSSProperties;

/** The key the picture travels by, from You into Profile and back (lib/ui/routeMotion.ts). */
const CARRY = "reader";

export function ReaderIdentity({
  name,
  picture,
  patron,
  badges,
  tier = null,
  under,
  end,
  carry,
  ring = false,
  nameClass = NAME_ON_PAGE,
  lineClass = LINE_ON_PAGE,
}: {
  name: string;
  picture: string | null;
  /** The patron saint chosen, or null for none (or not yet known). */
  patron: { slug: string; name: string } | null;
  /** The badges earned, or null while they are read: their row's height is kept. */
  badges: readonly BadgeId[] | null;
  /** The plan, as the supporter's mark by the name; never as words. */
  tier?: "plus" | "pro" | null;
  /** What stands under the name when no patron is chosen: an invitation, or nothing. */
  under?: ReactNode;
  /** At the row's end: the chevron of a link, or Edit. */
  end?: ReactNode;
  /** `from`: the picture leaves with the link it is in. `into`: it lands here. */
  carry?: "from" | "into";
  /** The white ring a picture wears on the Ladder. */
  ring?: boolean;
  nameClass?: string;
  lineClass?: string;
}) {
  return (
    <span data-reader-identity="" className="reader-who block">
      <span className="flex items-center gap-[15px]">
        <span
          data-reader-picture=""
          data-carry={carry === "from" ? CARRY : undefined}
          data-carry-into={carry === "into" ? CARRY : undefined}
          className={cn("inline-flex shrink-0 rounded-full", ring && "you-hero-ring")}
        >
          <ReaderAvatar name={name} picture={picture} size={66} />
        </span>
        <span className="min-w-0 flex-1">
          <span data-reader-name="" className={cn("reader-name", nameClass)}>
            {name}
            {tier ? (
              <span className="ms-2 inline-flex align-middle" style={INK}>
                <SupporterMark tier={tier} size={17} />
              </span>
            ) : null}
          </span>
          {patron ? <PatronLine patron={patron} className={lineClass} /> : (under ?? null)}
        </span>
        {end ?? null}
      </span>
      <ReaderBadges ids={badges} />
    </span>
  );
}

/**
 * The patron saint, as one quiet line under the name: his own small round
 * picture (the icon his page shows; a saint whose picture waits on a
 * permission stands by his name alone) and his name as the registry writes
 * it, in English, as the Saints list and the chooser write it.
 */
function PatronLine({ patron, className }: { patron: { slug: string; name: string }; className: string }) {
  const saint = patronFor(patron.slug, patron.name);
  if (!saint) return null;
  return (
    <span data-reader-patron={saint.slug} className={className}>
      {saint.icon ? (
        // The saint's icon the apps carry, at 22px, arriving whole as every face does (lib/ui/useArrivingImage.ts).
        <ArrivingImage
          src={saint.icon}
          width={22}
          height={22}
          decoding="async"
          className="dark-island size-[22px] shrink-0 rounded-full border border-paper/20 bg-night-soft object-cover object-top"
        />
      ) : null}
      <span lang="en" dir="ltr" className="min-w-0 leading-snug [overflow-wrap:anywhere] rtl:text-right">
        {saint.name}
      </span>
    </span>
  );
}

/**
 * The reader's badges, as the marks on their profile, in the house greys: a
 * glyph glowing white on a small round plate, never a badge's own colour
 * (lib/profile/badges.ts; the owner's rule, black, white and grey). The Pro
 * cross's ring is the ink here too. Only those earned: with none there is no
 * row, and while they are read the row's height is kept, so what stands
 * under it does not move when they come. For the eye and a screen reader both.
 */
function ReaderBadges({ ids }: { ids: readonly BadgeId[] | null }) {
  const { t } = useTranslate();
  if (ids === null) return <span aria-hidden className="mt-3 block h-[29px]" />;
  if (ids.length === 0) return null;
  return (
    <span role="list" aria-label={t("profile.badgesLabel")} data-you-badges="" className="mt-3 flex h-[29px] flex-wrap items-center gap-2.5 overflow-hidden">
      {ids.map((id) => (
        <span key={id} role="listitem" className="shrink-0">
          <span role="img" aria-label={t(`profile.badge.${id}`)} className="you-mark grid size-[29px] place-items-center rounded-full text-paper" style={INK}>
            <Medal id={id} size={29} />
          </span>
        </span>
      ))}
    </span>
  );
}
