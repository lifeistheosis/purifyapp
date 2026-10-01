"use client";

import Image from "next/image";
import { useState } from "react";

import { AvatarFrame } from "@/components/community/profile/AvatarFrame";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { cn } from "@/lib/cn";

/**
 * A reader's picture in Community: the feed, the replies, the composer and
 * the profile card all draw it here, so a Plus frame looks the same
 * everywhere it appears.
 *
 * Google pictures come through our own domain (lib/community/avatarSrc.ts),
 * no page address is sent with any picture, and a picture that still will
 * not load shows the initial instead of a broken-image icon.
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
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span
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
        {src && failedSrc !== src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes={`${size}px`}
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(src)}
            className="object-cover"
          />
        ) : (
          (name[0] ?? "R").toUpperCase()
        )}
      </span>
      <AvatarFrame decoration={decoration} size={size} />
    </span>
  );
}
