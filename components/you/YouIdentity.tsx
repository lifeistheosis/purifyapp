"use client";

// Who the reader is, standing on the Ladder at the top of the You tab (1.8,
// note 71): the owner's pick A of r3-25, "the Ladder, then the day"
// (Homebase/boards/purify-master/variants/r3-25-you.html). Their picture,
// ringed in white; their name large in the reading serif; under it the way
// to their profile; and under those their badges. A tap on the name or the
// picture opens their Profile, the one account screen about who they are
// (it stays a row of Settings too, with the account). In 1.9 a campaign a
// reader ran will stand by their badges (note 70).
//
// Signed out, Sign in stands where the name stands: the one ask on the
// screen, with the line on where their things are kept above it. It was the
// first row of the list at the foot of the tab.
//
// Until 1.8 this was a row under the picture: the picture, the name and
// "Member since", which itself replaced a card that said "Welcome back".

import Link from "next/link";
import type { CSSProperties } from "react";

import { BadgeGlyph } from "@/components/community/profile/ProfileBadges";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { User } from "@/components/ui/icons/User";
import { cn } from "@/lib/cn";
import type { BadgeId } from "@/lib/profile/badges";
import { useMyBadges } from "@/lib/profile/myBadges";
import { useMyPicture } from "@/lib/profile/myPicture";

/** Who is here: not known yet, nobody, or a reader with a name. */
export type YouWho = { state: "unknown" } | { state: "out" } | { state: "in"; id: string; name: string };

const NAME = "you-hero-ink block truncate font-heading text-[30px] font-bold leading-[1.15] tracking-[-0.01em] text-paper";
const UNDER = "you-hero-ink mt-1 flex items-center gap-1.5 font-sans text-detail text-paper/80";

/** The Pro cross draws its ring in the crimson token: on You it is the ink. */
const INK = { "--color-crimson": "var(--color-paper)" } as CSSProperties;

function Chevron() {
  return <ChevronLeft size={13} aria-hidden className="shrink-0 -scale-x-100 opacity-70 rtl:scale-x-100" />;
}

export function YouIdentity({ who }: { who: YouWho }) {
  const { t } = useTranslate();
  if (who.state === "in") return <SignedIn id={who.id} name={who.name} />;

  // Signed out, and while the device has not yet said who is here: the same
  // height, so nothing under it moves when it does.
  const known = who.state === "out";
  return (
    <div data-you-who={who.state} aria-hidden={known ? undefined : true} className={cn(!known && "invisible")}>
      <p className="you-hero-ink mb-2.5 font-sans text-caption text-paper/75">{t("ui.privateOnThisDeviceNo")}</p>
      <Link
        href="/signin?next=/account"
        data-you-signin={known ? "" : undefined}
        tabIndex={known ? undefined : -1}
        className="tap-press flex items-center gap-[15px] rounded-2xl"
      >
        <span className="you-hero-empty grid size-[66px] shrink-0 place-items-center rounded-full text-paper/70">
          <User size={28} strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className={NAME}>{t("common.signIn")}</span>
          <span className={UNDER}>
            {t("ui.syncAcrossDevicesOptional")}
            <Chevron />
          </span>
        </span>
      </Link>
    </div>
  );
}

function SignedIn({ id, name }: { id: string; name: string }) {
  const { t } = useTranslate();
  const me = useMyPicture();
  const badges = useMyBadges(id);
  return (
    <div data-you-who="in">
      <Link href="/account/profile" data-you-identity="" className="tap-press flex items-center gap-[15px] rounded-2xl">
        <span className="you-hero-ring inline-flex shrink-0 rounded-full">
          <ReaderAvatar name={name} picture={me.state === "in" ? me.picture : null} size={66} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={NAME}>{name}</span>
          <span className={cn(UNDER, "font-semibold")}>
            {t("profile.yourProfile")}
            <Chevron />
          </span>
        </span>
      </Link>
      {/* The row's height is kept while the badges are read, so the rope under
          it does not move when they come. */}
      <YouBadges ids={badges} />
    </div>
  );
}

/**
 * The reader's badges, as the marks on their profile, in the house greys: a
 * glyph glowing white on a small round plate, never a badge's own colour
 * (lib/profile/badges.ts; the owner's rule, black, white and grey). The Pro
 * cross's ring is the ink here too. For the eye and a screen reader both.
 */
function YouBadges({ ids }: { ids: readonly BadgeId[] | null }) {
  const { t } = useTranslate();
  if (ids === null) return <div aria-hidden className="mt-3 h-[29px]" />;
  if (ids.length === 0) return null;
  return (
    <ul aria-label={t("profile.badgesLabel")} data-you-badges="" className="mt-3 flex h-[29px] flex-wrap items-center gap-2.5 overflow-hidden">
      {ids.map((id) => (
        <li key={id} role="img" aria-label={t(`profile.badge.${id}`)} className="you-mark grid size-[29px] shrink-0 place-items-center rounded-full text-paper" style={INK}>
          <span className="you-mark-lit inline-flex">
            <BadgeGlyph id={id} size={16} />
          </span>
        </li>
      ))}
    </ul>
  );
}
