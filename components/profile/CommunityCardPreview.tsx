"use client";

// The reader's Community card on their Profile, drawn as the card itself: the
// light or their banner at its top, their picture in its frame, the name, the
// @handle, the status, and their badges, as another reader sees them when
// they tap the name (1.9, build 98 note 11). The whole card is the way into
// its editor.
//
// It was one row of words about the card ("Your Community profile", "Your
// handle, status, badges and how your card looks."), a tap away from the
// thing it described. The card is made of Community's own pieces
// (components/community/profile/ProfileCard.tsx: ProfileTop, ProfileFace, the
// surface a theme paints), as the column beside the feed draws a reader's own
// (components/community/CommunitySide.tsx), so it cannot drift from what
// others see. The card is the one the device keeps (lib/profile/myCard.ts),
// there from the first paint and asked for again on each visit.
//
// Until the website has ever said what the card holds (a first visit with no
// signal), the row of words stands, so the way in is never missing.

import Link from "next/link";
import type { CSSProperties } from "react";

import { Medal } from "@/components/community/profile/ProfileBadges";
import { ProfileFace, ProfileTop, profileSurface, surfaceClass } from "@/components/community/profile/ProfileCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { cn } from "@/lib/cn";
import { isBadgeId } from "@/lib/profile/badges";
import { useMyCard } from "@/lib/profile/myCard";

const EDIT = "/account/profile/edit";

/** The Pro cross draws its ring in the crimson token: on the small plates it is the ink. */
const INK = { "--color-crimson": "var(--color-paper)" } as CSSProperties;

function Chevron({ className }: { className?: string }) {
  return <ChevronLeft size={15} aria-hidden className={cn("shrink-0 -scale-x-100 rtl:scale-x-100", className)} />;
}

export function CommunityCardPreview({ className }: { className?: string }) {
  const { t } = useTranslate();
  const card = useMyCard({ fresh: true });

  if (!card) {
    return (
      <Link
        href={EDIT}
        data-profile-community="row"
        className={cn("flex items-center justify-between gap-4 px-4 py-3.5 motion-safe:transition-colors active:bg-paper/[0.04]", INDEX_LIST_LOOK, className)}
      >
        <span className="min-w-0">
          <span className="block font-sans text-ui text-paper">{t("profile.accountLinkTitle")}</span>
          <span className="mt-0.5 block font-sans text-caption leading-[1.5] text-paper/55">{t("profile.accountLinkBody")}</span>
        </span>
        <Chevron className="text-paper/35" />
      </Link>
    );
  }

  const surface = profileSurface(card.cosmetics);
  const badges = card.badges.filter((b) => isBadgeId(b.id));
  return (
    <section data-profile-community="card" aria-labelledby="profile-community-title" className={className}>
      <p id="profile-community-title" className="px-1 font-sans text-caption font-semibold text-paper/55">
        {t("profile.accountLinkTitle")}
      </p>
      <Link
        href={EDIT}
        className={cn("tap-press mt-2.5 block min-h-11 overflow-hidden rounded-2xl border", surfaceClass(surface), surface.themed ? "border-white/10" : "border-paper/10")}
        style={surface.style}
      >
        <div className="relative px-4 pb-3 pt-7">
          <ProfileTop cosmetics={card.cosmetics} height={150} />
          <ProfileFace profile={card} nameAs="p" compact />
          {badges.length ? (
            <div role="list" aria-label={t("profile.badgesLabel")} className="relative mt-3.5 flex h-[29px] flex-wrap items-center justify-center gap-2.5 overflow-hidden">
              {badges.map((b) => (
                <span key={b.id} role="listitem" className="shrink-0">
                  <span role="img" aria-label={t(`profile.badge.${b.id}`)} className="you-mark grid size-[29px] place-items-center rounded-full text-paper" style={INK}>
                    <Medal id={b.id} size={29} />
                  </span>
                </span>
              ))}
            </div>
          ) : null}
          {/* The way in, said once at the card's foot. */}
          <p className="relative mt-3.5 flex min-h-11 items-center justify-center gap-1.5 border-t border-paper/10 pt-1 font-sans text-detail font-semibold text-paper/80">
            {t("profile.edit")}
            <Chevron className="opacity-70" />
          </p>
        </div>
      </Link>
    </section>
  );
}
