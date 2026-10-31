"use client";

import { useState } from "react";

import { InitialsAvatar } from "@/components/profile/InitialsAvatar";
import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * The reader's own picture in the app's chrome (the nav, the phone header,
 * the account page), on the same hairline disc as InitialsAvatar, which it
 * falls back to when there is no picture or it will not load. No page
 * address is sent with the picture, as in Community (CommunityAvatar).
 *
 * It arrives whole, as Community's faces do (build 85, note 52): the
 * initials stand in its place while it loads, and it fades in over them once
 * it has loaded and decoded (lib/ui/useArrivingImage.ts), never a band at a
 * time, and the disc keeps its size throughout.
 */
export function ReaderAvatar({
  name,
  picture,
  size,
  className,
}: {
  name: string | null | undefined;
  picture: string | null | undefined;
  /** Diameter in px. */
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const shown = picture && failed !== picture ? picture : null;
  const { ref, onArrive } = useArrivingImage(shown, () => setFailed(shown));
  if (!shown) {
    return <InitialsAvatar name={name} size={size} className={className} />;
  }
  return (
    <span
      aria-hidden="true"
      data-reader-avatar=""
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the reader's own picture, at the size it was cut for. */}
      <img
        key={shown}
        ref={ref}
        src={shown}
        alt=""
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={onArrive}
        onError={() => setFailed(shown)}
        className="img-arrive absolute inset-0 h-full w-full rounded-full border border-paper/15 bg-paper/[0.06] object-cover"
      />
      <InitialsAvatar name={name} size={size} className="img-arrive-under" />
    </span>
  );
}
