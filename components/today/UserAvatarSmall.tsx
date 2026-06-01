"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function initialsFromName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Small circular avatar slot for the mobile top tabs.
 *
 * Mirrors the AppNav pattern: when signed in, render a gold-ringed disc
 * with two-letter initials over a warm dark gradient; when signed out,
 * render a small generic person glyph that links to /signin.
 *
 * Client-only so the Supabase session check happens after hydration
 * without a flash of "signed in" before we know.
 */
export function UserAvatarSmall() {
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      setInitials("");
      return;
    }
    const supa = createBrowserClient(url, anon);
    let alive = true;
    supa.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      if (!user) {
        setInitials("");
        return;
      }
      const name =
        (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
      setInitials(initialsFromName(name));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (initials === null) {
    // Pre-hydration: render a placeholder disc the same size to prevent
    // layout shift when the real state arrives.
    return <span className="block h-8 w-8 rounded-full bg-paper/8" aria-hidden />;
  }

  if (initials) {
    return (
      <Link
        href="/account"
        aria-label="Account"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/55 hover:border-gold transition-colors"
        style={{
          background:
            "linear-gradient(155deg, #2a1f10 0%, #3b2a14 50%, #5a3f1c 100%)",
        }}
      >
        <span className="font-display-serif text-eyebrow text-cream tracking-[0.04em]">
          {initials}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/signin"
      aria-label="Sign in"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/20 text-paper/70 hover:text-paper hover:border-paper/40 transition-colors"
    >
      <svg
        width={16}
        height={16}
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
