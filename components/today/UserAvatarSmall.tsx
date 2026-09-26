"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { InitialsAvatar } from "@/components/profile/InitialsAvatar";

/**
 * Small circular avatar slot for the mobile top tabs.
 *
 * Mirrors the AppNav pattern: when signed in, render the reader's initials
 * on the shared neutral disc (InitialsAvatar, no gold since 2026-09-25);
 * when signed out, render a small generic person glyph that links to
 * /signin.
 *
 * Client-only so the Supabase session check happens after hydration
 * without a flash of "signed in" before we know.
 */
export function UserAvatarSmall() {
  const { t } = useTranslate();
  // With no Supabase env there is no session to look up, so settle on
  // signed-out from the first render. The env is inlined at build time,
  // so server and client renders agree.
  // null: not known yet. "": signed out. Anything else: the name to draw.
  const [name, setName] = useState<string | null>(() =>
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? null
      : "",
  );

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    const supa = createBrowserClient(url, anon);
    let alive = true;
    supa.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      if (!user) {
        setName("");
        return;
      }
      setName(
        (user.user_metadata?.display_name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split("@")[0] ||
          "Reader",
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  if (name === null) {
    // Pre-hydration: render a placeholder disc the same size to prevent
    // layout shift when the real state arrives.
    return <span className="block h-10 w-10 rounded-full bg-paper/8" aria-hidden />;
  }

  if (name) {
    return (
      <Link
        href="/account"
        aria-label={t("nav.yourAccount")}
        className="hit-44 inline-flex rounded-full ring-1 ring-transparent transition-shadow hover:ring-paper/40"
      >
        <InitialsAvatar name={name} size={40} />
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
