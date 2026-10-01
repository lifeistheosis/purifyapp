"use client";

import Link from "next/link";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { ProfileBanner, ProfileHeader, profileSurface } from "@/components/community/profile/ProfileCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CTA } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";
import type { Decoration } from "@/lib/profile/cosmetics";
import type { MyProfile } from "@/lib/profile/publicProfile";

/**
 * The column beside the feed on a wide screen: your own profile as others
 * see it, and, for a reader without Plus, what Plus adds to it.
 *
 * Desktop only. On a phone the feed is the whole screen, and your profile is
 * one tap away on your own picture in the composer.
 */

export function MyProfileCard({ profile, onView }: { profile: MyProfile; onView: () => void }) {
  const { t } = useTranslate();
  const surface = profileSurface(profile.cosmetics);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border",
        surface.themed ? "dark-island border-white/10" : "border-paper/10 bg-night-soft",
      )}
      style={surface.style}
    >
      <ProfileBanner cosmetics={profile.cosmetics} className="h-16" />
      <div className="px-4 pb-4">
        <ProfileHeader profile={profile} avatarSize={56} ring={4} nameAs="p" />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-pill border border-paper/20 font-sans text-detail font-semibold text-paper/85 hover:border-paper/40 hover:text-paper"
          >
            {t("profile.view")}
          </button>
          <Link
            href="/account/profile/edit"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-pill bg-paper font-sans text-detail font-semibold text-night hover:bg-paper/90"
          >
            {t("profile.edit")}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Three of the frames on the reader's own picture: the nudge shows, not tells. */
const SAMPLE_FRAMES: Decoration[] = ["halo", "laurel", "stars"];

export function PlusProfileNudge({ profile }: { profile: MyProfile }) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  return (
    <div className="rounded-2xl border border-premium/30 bg-premium/[0.05] p-4">
      <p role="heading" aria-level={2} className="font-serif text-lede leading-snug text-paper">
        {t("profile.plusNudgeTitle")}
      </p>
      <p className="mt-1.5 font-sans text-detail leading-relaxed text-paper/65">{t("profile.plusNudgeBody")}</p>
      <div className="mt-4 flex items-center gap-5 px-2" aria-hidden="true">
        {SAMPLE_FRAMES.map((d) => (
          <CommunityAvatar key={d} name={profile.name} url={profile.avatar} size={36} decoration={d} />
        ))}
      </div>
      <button type="button" onClick={() => upgrade.open("profile")} className={cn(PREMIUM_CTA, "mt-4 min-h-11 w-full text-detail")}>
        {t("profile.plusNudgeCta")}
      </button>
    </div>
  );
}
