"use client";

import Image from "next/image";
import { useState } from "react";

import { InitialsAvatar } from "@/components/profile/InitialsAvatar";

/**
 * The reader's own picture in the app's chrome (the nav, the phone header,
 * the account page), on the same hairline disc as InitialsAvatar, which it
 * falls back to when there is no picture or it will not load. No page
 * address is sent with the picture, as in Community (CommunityAvatar).
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
  if (!picture || failed === picture) {
    return <InitialsAvatar name={name} size={size} className={className} />;
  }
  return (
    <span
      aria-hidden="true"
      className={
        "relative inline-flex shrink-0 overflow-hidden rounded-full border border-paper/15 bg-paper/[0.06]" +
        (className ? ` ${className}` : "")
      }
      style={{ width: size, height: size }}
    >
      <Image
        src={picture}
        alt=""
        fill
        sizes={`${size}px`}
        unoptimized
        referrerPolicy="no-referrer"
        onError={() => setFailed(picture)}
        className="object-cover"
      />
    </span>
  );
}
