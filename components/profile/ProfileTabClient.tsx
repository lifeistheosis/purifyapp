"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { SyncOnMount } from "@/components/profile/SyncOnMount";
import { AccountChipRow } from "@/components/profile/AccountChipRow";
import { AccountSettingsLinks } from "@/components/profile/AccountSettingsLinks";
import { PostSignInBridge } from "@/components/profile/PostSignInBridge";

/**
 * Client-side profile tab. The page shell stays a server component (so it can
 * export `metadata`), but the user/profile read runs client-side here so it
 * works in the native local-first export where there is no server session at
 * build time. AccountAuthGate has already ensured a signed-in user by the
 * time this renders.
 */
export function ProfileTabClient() {
  const [data, setData] = useState<{
    email: string;
    displayName: string;
    joinedAt: string;
    lastSignedInAt?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // Read the LOCAL session (getSession), not getUser(): getUser() makes a
      // network round-trip that can hang on open, leaving this stuck on
      // "Loading your profile…" forever (F-13). The account is already gated
      // (server proxy on web, AccountAuthGate on native), so the local session
      // is the right, non-blocking source of the signed-in identity.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, joined_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const displayName =
        (profile?.display_name as string | undefined) ??
        (user.user_metadata?.display_name as string | undefined) ??
        (user.email?.split("@")[0] ?? "Reader");
      const joinedAt =
        (profile?.joined_at as string | undefined) ?? user.created_at ?? "";
      setData({
        email: user.email ?? "",
        displayName,
        joinedAt,
        lastSignedInAt: user.last_sign_in_at ?? undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <p className="py-10 text-center font-sans text-caption text-paper/45">
        Loading your profile…
      </p>
    );
  }

  return (
    <>
      <SyncOnMount />
      <PostSignInBridge />
      <AccountChipRow />
      <ProfileHero
        email={data.email}
        initialDisplayName={data.displayName}
        joinedAt={data.joinedAt}
        lastSignedInAt={data.lastSignedInAt}
      />
      <ProfileStats />
      <ProfileActivity />
      <AccountSettingsLinks />
    </>
  );
}
