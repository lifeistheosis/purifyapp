"use client";

import Link from "next/link";

import { MedalCase } from "@/components/community/profile/ProfileBadges";
import { ProfileAboutDoor, ProfileFace, ProfileTop, profileSurface, surfaceClass } from "@/components/community/profile/ProfileCard";
import { ProfileDoors } from "@/components/community/profile/ProfileDoors";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { profileDoors } from "@/lib/profile/doors";
import type { PublicProfile } from "@/lib/profile/publicProfile";

/**
 * A profile on its own page (app/(app)/u/[handle]): the same card as in
 * Community (r3-28 A: the light or the banner at the top, the picture, the
 * name, the status, then About and Badges behind their doors), standing
 * alone, with the way into Community underneath. The page reads no posts,
 * so it has no Posts door; Community has them.
 */
export function SharedProfile({ profile }: { profile: PublicProfile }) {
  const { t } = useTranslate();
  const surface = profileSurface(profile.cosmetics);
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div
        className={cn("relative overflow-hidden rounded-2xl border shadow-2xl", surfaceClass(surface), surface.themed ? "border-white/10" : "border-paper/15")}
        style={surface.style}
      >
        <ProfileEffect effect={profile.cosmetics.effect} quiet />
        <div className="relative z-10 px-5 pb-6 pt-[50px]">
          <ProfileTop cosmetics={profile.cosmetics} />
          <ProfileFace profile={profile} celebrating={Boolean(profile.nameDay)} />
          <ProfileDoors
            doors={profileDoors(profile, { posts: false })}
            label={t("profile.sections")}
            panels={{
              about: <ProfileAboutDoor profile={profile} />,
              badges: <MedalCase badges={profile.badges} />,
            }}
          />
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
