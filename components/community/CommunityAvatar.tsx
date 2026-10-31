"use client";

import { useState } from "react";

import { AvatarFrame } from "@/components/community/profile/AvatarFrame";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * A reader's picture in Community: the feed, the replies, the composer and
 * the profile card all draw it here, so a Plus frame looks the same
 * everywhere it appears.
 *
 * Google pictures come through our own domain (lib/community/avatarSrc.ts),
 * no page address is sent with any picture, and a picture that still will
 * not load shows the initial instead of a broken-image icon.
 *
 * It arrives whole (build 85, note 52: on the prayer wall the faces loaded
 * "in half and then the other half"). The disc, its ring, the frame and the
 * initial are there at once, and the picture waits unseen until it has
 * loaded and decoded, then fades in over the initial on the app's motion
 * switch (lib/ui/useArrivingImage.ts). Nothing in the row moves when it comes.
 *
 * `ring` paints a border in the surface colour around the picture, the way
 * a profile card lifts its avatar off the banner.
 */
export function CommunityAvatar({
  name,
  url,
  size = 36,
  decoration,
  ring,
  className,
}: {
  name: string;
  url: string | null;
  size?: number;
  decoration?: string | null;
  /** A surface-coloured border, in px, for an avatar laid over a banner. */
  ring?: number;
  className?: string;
}) {
  const src = avatarSrc(url);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const picture = src && failedSrc !== src ? src : null;
  const { ref, onArrive } = useArrivingImage(picture, () => setFailedSrc(picture));
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span
        data-community-avatar=""
        className={cn(
          "relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full font-sans font-semibold text-paper/70",
          // Over a banner the picture needs a solid ground; in a list the
          // faint tint the feed has always had.
          ring ? "bg-night-soft" : "bg-paper/[0.06]",
        )}
        style={{
          fontSize: size * 0.4,
          boxShadow: ring
            ? `0 0 0 ${ring}px var(--profile-surface, var(--color-night-soft))`
            : "inset 0 0 0 1px color-mix(in oklab, var(--color-paper) 15%, transparent)",
        }}
      >
        {picture ? (
          // A plain img: the address is already the one to load (our own
          // storage, or Google's through our optimizer), and the optimizer
          // would add nothing for a picture this small.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={picture}
            ref={ref}
            src={picture}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={onArrive}
            onError={() => setFailedSrc(picture)}
            className="img-arrive absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {/* The initial: the placeholder while the picture comes, and the
            avatar when there is none. */}
        <span aria-hidden={picture ? true : undefined} className="img-arrive-under">
          {(name[0] ?? "R").toUpperCase()}
        </span>
      </span>
      <AvatarFrame decoration={decoration} size={size} />
    </span>
  );
}
