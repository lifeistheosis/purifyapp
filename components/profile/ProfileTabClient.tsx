"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { SyncOnMount } from "@/components/profile/SyncOnMount";
import { AccountChipRow } from "@/components/profile/AccountChipRow";
import { AccountSettingsLinks } from "@/components/profile/AccountSettingsLinks";
import { PostSignInBridge } from "@/components/profile/PostSignInBridge";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Client-side profile tab. The page shell stays a server component (so it can
 * export `metadata`), but the user/profile read runs client-side here so it
 * works in the native local-first export where there is no server session at
 * build time. AccountAuthGate has already ensured a signed-in user by the
 * time this renders.
 */
export function ProfileTabClient() {
  const { t } = useTranslate();
  const [data, setData] = useState<{
    email: string;
    displayName: string;
    joinedAt: string;
    lastSignedInAt?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Identity comes from the persisted cookie, read synchronously — NO
    // network, NO refresh, NO auth lock — so this can never hang (F-13:
    // getUser()/getSession() stalled on re-navigation and stranded this on
    // "Loading your profile…" forever). Render from the session IMMEDIATELY so
    // the tab is never blocked on a follow-up query; the profiles row (a nicer
    // display name / join date) enhances it when it arrives. The server proxy
    // keeps the cookie fresh; getSession() is only a fallback if the raw read
    // can't parse.
    const sessionUser = readLocalSessionUser();
    if (sessionUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData({
        email: sessionUser.email ?? "",
        displayName:
          (sessionUser.user_metadata?.display_name as string | undefined) ??
          (sessionUser.email?.split("@")[0] ?? "Reader"),
        joinedAt: sessionUser.created_at ?? "",
        lastSignedInAt: sessionUser.last_sign_in_at ?? undefined,
      });
    }
    (async () => {
      const supabase = createClient();
      const user =
        sessionUser ??
        (await supabase.auth.getSession()).data.session?.user ??
        null;
      if (!user || cancelled) return;
      // If we had no session user above, render from the SDK result now.
      if (!sessionUser) {
        setData({
          email: user.email ?? "",
          displayName:
            (user.user_metadata?.display_name as string | undefined) ??
            (user.email?.split("@")[0] ?? "Reader"),
          joinedAt: user.created_at ?? "",
          lastSignedInAt: user.last_sign_in_at ?? undefined,
        });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, joined_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      // Enhance with the persisted display name / join date.
      setData((prev) => ({
        email: prev?.email ?? user.email ?? "",
        displayName:
          (profile.display_name as string | undefined) ??
          prev?.displayName ??
          "Reader",
        joinedAt:
          (profile.joined_at as string | undefined) ?? prev?.joinedAt ?? "",
        lastSignedInAt: prev?.lastSignedInAt ?? user.last_sign_in_at ?? undefined,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <p className="py-10 text-center font-sans text-caption text-paper/45">
        {t("ui.loadingYourProfile")}
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
      {/* Desktop only. On a phone this screen is one tap below the You
          tab, which already shows the same four counters and eight of
          these nine rows; DesktopAccountGate redirects signed-in desktop
          users straight here, so at md and above this IS the dashboard and
          both blocks have to stay. */}
      <div className="hidden md:block">
        <ProfileStats />
      </div>
      <ProfileActivity />
      <div className="hidden md:block">
        <AccountSettingsLinks />
      </div>
    </>
  );
}
