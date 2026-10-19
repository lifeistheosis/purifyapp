"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { communityEnabled } from "@/lib/community/flags";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { SyncOnMount } from "@/components/profile/SyncOnMount";
import { AccountSettingsLinks } from "@/components/profile/AccountSettingsLinks";
import { PostSignInBridge } from "@/components/profile/PostSignInBridge";
import { PatronSaintPicker } from "@/components/profile/PatronSaintPicker";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Client-side profile tab. The page shell stays a server component (so it can
 * export `metadata`), but the user/profile read runs client-side here so it
 * works in the native local-first export where there is no server session at
 * build time. AccountAuthGate has already ensured a signed-in user by the
 * time this renders.
 *
 * On a phone, and in the apps at any width (1.8): who the reader is
 * (ProfileHero), the way to their Community profile, and their patron saint,
 * in the phone screens' own look. Until 1.8 the phone also got a row of three
 * tiles over the name (Saved, Saints, Discover: three ways out that the tab
 * bar and the You tab already are) and, under it, the three newest things
 * saved as three large cards with arrows, a third copy of what the You tab
 * and Saved show. Both were the look the rest of the app had left, and both
 * go. The desktop dashboard keeps its counts, its newest saves and its links,
 * since on a computer this screen is the dashboard.
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
    // The picture, the name and the facts, in their places, while the
    // session is read: a line of words here read as a broken screen.
    return (
      <div aria-busy="true" aria-label={t("ui.loadingYourProfile")} className="flex flex-col items-center pt-2 md:items-start">
        <Skeleton weight="mid" rounded="rounded-full" className="h-20 w-20" />
        <Skeleton weight="strong" className="mt-4 h-7 w-44" />
        <Skeleton weight="faint" className="mt-2.5 h-3.5 w-52" />
        <Skeleton weight="faint" rounded="rounded-2xl" className="mt-8 h-[146px] w-full" />
      </div>
    );
  }

  return (
    <>
      <SyncOnMount />
      <PostSignInBridge />
      <ProfileHero
        email={data.email}
        initialDisplayName={data.displayName}
        joinedAt={data.joinedAt}
        lastSignedInAt={data.lastSignedInAt}
      />
      {/* The way to the Community profile: what others see when they tap
          your name. Only where Community is switched on. One row, as a list
          of Settings draws it. */}
      {communityEnabled() ? (
        <Link
          href="/account/profile/edit"
          data-profile-community=""
          className={`mt-4 flex items-center justify-between gap-4 px-4 py-3.5 motion-safe:transition-colors active:bg-paper/[0.04] ${INDEX_LIST_LOOK}`}
        >
          <span className="min-w-0">
            <span className="block font-sans text-ui text-paper">{t("profile.accountLinkTitle")}</span>
            <span className="mt-0.5 block font-sans text-caption leading-[1.5] text-paper/55">{t("profile.accountLinkBody")}</span>
          </span>
          <ChevronLeft size={16} aria-hidden className="shrink-0 -scale-x-100 text-paper/35 rtl:scale-x-100" />
        </Link>
      ) : null}
      {/* Phones and the apps only: the patron saint, with the rest of who the
          reader is. On the desktop dashboard it is on the Data tab, where it
          was; a phone's Data screen no longer draws it (1.6, one home each). */}
      <div className="mt-6 md:hidden native-md-block">
        <PatronSaintPicker />
      </div>
      {/* The computer's dashboard only. DesktopAccountGate sends signed-in
          readers on a computer straight here, so at md and above this IS the
          dashboard and these stay. In the apps, at any width, this screen is
          a row of Settings and of the You tab's name, and the You tab holds
          what these hold. */}
      <div className="hidden md:block native-md-hidden" data-desktop-only="">
        <ProfileStats />
        <ProfileActivity />
        <AccountSettingsLinks />
      </div>
    </>
  );
}
