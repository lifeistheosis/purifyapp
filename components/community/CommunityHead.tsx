"use client";

import type { ReactNode } from "react";

import { PrayTalkSwitch } from "@/components/community/PrayTalkSwitch";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { cn } from "@/lib/cn";
import type { CommunityHalf } from "@/lib/community/halves";
import { TILE_PREVIEWS } from "@/lib/discover/tilePreviews.generated";

/** Community's own picture: Pentecost, the apostles together and given the words to speak (its tile on Discover). */
export const COMMUNITY_PICTURE = "/discover/tiles/chat.webp";

/**
 * The head of Community (1.8, the owner's pick of r3-02, "B with A's top"):
 * the page's name, the bell, and the one switch, Pray together and Talk
 * together.
 *
 * In Pray together it is A's head: the Pentecost icon fades in behind the
 * name and melts into the page (app/globals.css, "Community: Pray together
 * and Talk together"), and the campaign running now sits under the switch
 * (PrayTogether), gone when none runs. Talk together is B's plain head.
 *
 * The switch is not drawn in a group's thread, which is a conversation of
 * its own with its own way back out.
 */
export function CommunityHead({
  half,
  onChoose,
  showSwitch,
  bell,
  idBase,
}: {
  half: CommunityHalf;
  onChoose: (next: CommunityHalf) => void;
  showSwitch: boolean;
  /** The bell, for a reader with an account (CommunityBell). */
  bell: ReactNode;
  idBase: string;
}) {
  const { t } = useTranslate();
  const onPicture = half === "pray" && showSwitch;
  const preview = TILE_PREVIEWS[COMMUNITY_PICTURE]?.src;

  return (
    <div className={cn("community-head relative", onPicture && "community-on-picture")}>
      {onPicture ? (
        <div aria-hidden data-community-picture="" className="community-head-picture pointer-events-none absolute inset-x-0 top-0 mx-auto h-[300px] max-w-[760px] overflow-hidden">
          {/* Its tiny preview, blurred, at once: the head is never an empty
              box while the picture comes (Discover's tiles do the same). */}
          {preview ? (
            <span className="absolute inset-0 scale-110 bg-cover bg-center blur-md" style={{ backgroundImage: `url(${preview})` }} />
          ) : null}
          {/* The head's entrance moves the frame; the picture in it waits
              unseen until it is whole and decoded, then fades in over the
              preview, never a band at a time (build 85, note 52). */}
          <span className="community-head-img absolute inset-0">
            <ArrivingImage
              src={COMMUNITY_PICTURE}
              width={507}
              height={396}
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-[50%_34%]"
            />
          </span>
          <span className="community-head-shade absolute inset-0" />
        </div>
      ) : null}

      <header className="relative mx-auto w-full max-w-[720px] px-5 pt-8 md:pt-12 lg:max-w-[1060px]">
        <div className="flex items-start justify-between gap-3">
          <h1 className="community-head-title text-heading font-bold leading-[1.1] text-paper">{t("community.title")}</h1>
          {bell}
        </div>
        {showSwitch ? (
          <div className="mt-4 lg:max-w-[720px]">
            <PrayTalkSwitch half={half} onChoose={onChoose} idBase={idBase} />
          </div>
        ) : null}
      </header>
    </div>
  );
}
