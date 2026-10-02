"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ProfileBanner, ProfileHeader, profileSurface } from "@/components/community/profile/ProfileCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { cachedProfile, loadProfile } from "@/lib/profile/cache";
import type { ProfileSeed, PublicProfile } from "@/lib/profile/publicProfile";

/**
 * The small card that appears when a mouse rests on a name in Community,
 * the way Discord shows a popout before the full profile.
 *
 * Mouse only: a touch has no hover, and a tap already opens the full card.
 * It reads the same cache the full card does (lib/profile/cache.ts), so the
 * profile it loads is the one a click then opens with no wait.
 */

export type HoverTarget = { handle: string; seed: ProfileSeed; rect: DOMRect };

const WIDTH = 300;

export function ProfileHoverCard({
  target,
  onOpen,
  onKeep,
  onLeave,
}: {
  target: HoverTarget | null;
  onOpen: (handle: string, seed: ProfileSeed) => void;
  /** The pointer moved onto the card: keep it up. */
  onKeep: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const handle = target?.handle ?? null;

  useEffect(() => {
    if (!handle) return;
    let alive = true;
    void loadProfile(handle).then((res) => {
      if (alive && res.ok) setProfile(res.profile);
    });
    return () => {
      alive = false;
    };
  }, [handle]);

  useLayoutEffect(() => {
    if (!target) return;
    const r = target.rect;
    const left = Math.min(Math.max(12, r.left), window.innerWidth - WIDTH - 12);
    const below = window.innerHeight - r.bottom;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlace(below > 300 ? { left, top: r.bottom + 8 } : { left, bottom: window.innerHeight - r.top + 8 });
  }, [target]);

  if (!target || !place || typeof document === "undefined") return null;
  const shown = profile && profile.handle === target.handle ? profile : (cachedProfile(target.handle) ?? null);
  const card = shown ?? {
    handle: target.seed.handle,
    name: target.seed.name,
    avatar: target.seed.avatar,
    status: null,
    badges: [],
    cosmetics: {
      bannerColor: null,
      bannerUrl: null,
      themePrimary: null,
      themeAccent: null,
      decoration: target.seed.decoration ?? null,
      effect: null,
      nameColor: target.seed.nameColor ?? null,
      bannerMotion: null,
    },
    clergy: target.seed.clergy
      ? { rank: target.seed.clergy === "clergy" ? null : target.seed.clergy, jurisdiction: null, parish: null }
      : null,
  };
  const surface = profileSurface(card.cosmetics);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={card.name}
      onPointerEnter={onKeep}
      onPointerLeave={onLeave}
      className={cn(
        "fixed z-[70] overflow-hidden rounded-2xl border shadow-2xl",
        surface.themed ? "dark-island border-white/10" : "border-paper/15 bg-night-soft",
      )}
      style={{ ...place, width: WIDTH, ...surface.style }}
    >
      <ProfileBanner cosmetics={card.cosmetics} className="h-14" />
      <div className="px-4 pb-4">
        <ProfileHeader profile={card} avatarSize={52} ring={4} nameAs="p" celebrating={Boolean(shown?.nameDay)} />
        {shown?.bio ? <p className="mt-2 line-clamp-2 font-sans text-detail text-paper/75">{shown.bio}</p> : null}
        <button
          type="button"
          onClick={() => onOpen(target.handle, target.seed)}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-pill border border-paper/20 font-sans text-detail font-semibold text-paper/85 hover:border-paper/40 hover:text-paper"
        >
          {t("profile.openProfile")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
