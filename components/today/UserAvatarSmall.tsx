"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { useMyPicture } from "@/lib/profile/myPicture";

/**
 * Small circular avatar slot for the mobile top tabs.
 *
 * Mirrors the AppNav pattern: when signed in, the reader's picture (or their
 * initials on the shared neutral disc when they have none, InitialsAvatar,
 * no gold since 2026-09-25); when signed out, a small generic person glyph
 * that links to /signin. The name and picture come from the same store as
 * the desktop nav (lib/profile/myPicture.ts), so the two always agree.
 *
 * Client-only so the session check happens after hydration without a flash
 * of "signed in" before we know.
 */
export function UserAvatarSmall() {
  const { t } = useTranslate();
  const me = useMyPicture();

  if (me.state === "unknown") {
    // Pre-hydration: render a placeholder disc the same size to prevent
    // layout shift when the real state arrives.
    return <span className="block h-10 w-10 rounded-full bg-paper/8" aria-hidden />;
  }

  if (me.state === "in") {
    return (
      <Link
        href="/account"
        aria-label={t("nav.yourAccount")}
        className="hit-44 inline-flex rounded-full ring-1 ring-transparent transition-shadow hover:ring-paper/40"
      >
        <ReaderAvatar name={me.name} picture={me.picture} size={40} />
      </Link>
    );
  }

  return (
    <Link
      href="/signin"
      aria-label={t("nav.signIn")}
      className="hit-44 flex h-10 w-10 items-center justify-center rounded-full border border-paper/20 text-paper/70 hover:text-paper hover:border-paper/40 transition-colors"
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </Link>
  );
}
