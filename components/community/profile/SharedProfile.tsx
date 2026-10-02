"use client";

import Link from "next/link";

import { BadgeList } from "@/components/community/profile/ProfileBadges";
import { ProfileAbout, ProfileBanner, ProfileHeader, profileSurface } from "@/components/community/profile/ProfileCard";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { PublicProfile } from "@/lib/profile/publicProfile";

/**
 * A profile on its own page (app/(app)/u/[handle]): the same card as in
 * Community, standing alone, with the way into Community underneath.
 */
export function SharedProfile({ profile }: { profile: PublicProfile }) {
  const { t } = useTranslate();
  const surface = profileSurface(profile.cosmetics);
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border shadow-2xl",
          surface.themed ? "dark-island border-white/10" : "border-paper/15 bg-night-soft",
        )}
        style={surface.style}
      >
        <ProfileEffect effect={profile.cosmetics.effect} />
        <div className="relative z-10">
          <ProfileBanner cosmetics={profile.cosmetics} className="h-32" />
          <div className="px-5 pb-6">
            <ProfileHeader profile={profile} celebrating={Boolean(profile.nameDay)} />
            <div className="mt-4">
              {profile.private ? (
                <p className="rounded-xl border border-paper/[0.08] bg-black/20 p-4 font-sans text-detail text-paper/70">
                  {t("profile.privateNotice")}
                </p>
              ) : (
                <ProfileAbout profile={profile} />
              )}
            </div>
            {!profile.private && profile.badges.length > 0 ? (
              <div className="mt-5">
                <p role="heading" aria-level={2} className="mb-2 font-sans text-caption font-semibold text-paper/55">
                  {t("profile.tabBadges")}
                </p>
                <BadgeList badges={profile.badges} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/community#@${profile.handle}`}
          className="inline-flex h-11 items-center rounded-pill bg-paper px-6 font-sans text-detail font-semibold text-night hover:bg-paper/90"
        >
          {t("profile.openInCommunity")}
        </Link>
      </div>
    </div>
  );
}
