"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { communityEnabled } from "@/lib/community/flags";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { CommunityCardPreview } from "@/components/profile/CommunityCardPreview";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { SyncOnMount } from "@/components/profile/SyncOnMount";
import { AccountSettingsLinks } from "@/components/profile/AccountSettingsLinks";
import { PostSignInBridge } from "@/components/profile/PostSignInBridge";
import { PatronSaintPicker } from "@/components/profile/PatronSaintPicker";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Skeleton } from "@/components/ui/Skeleton";
import { LifeKeptHere } from "@/components/you/LifeKept";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Client-side profile tab. The page shell stays a server component (so it can
 * export `metadata`), but the user/profile read runs client-side here so it
 * works in the native local-first export where there is no server session at
 * build time. AccountAuthGate has already ensured a signed-in user by the
 * time this renders.
 *
 * Redrawn for 1.9 with the You tab, as one design (build 98 note 11; the
 * owner, 2026-11-15, with a photo of each: "can your revamp the your profile
 * screen"). It read as an account's record: the address the reader signs in
 * with large under their name, "Last signed in", the plan as a row of text,
 * and what is the reader's own split between this page, You and the
 * Community profile. Now, on a phone and in the apps at any width, top to
 * bottom, who the reader is and nothing of the account:
 *
 *   1. The one piece You wears on its Ladder (ProfileHero, ReaderIdentity):
 *      the picture, the name, the patron saint, the badges; Edit.
 *   2. The patron saint as a picture card, with the way to change him
 *      (PatronSaintPicker).
 *   3. The life kept: the days, the week's knots and the week's line, the
 *      same piece as on You (components/you/LifeKept.tsx).
 *   4. The Community card, drawn as others see it, the way into its editor
 *      (CommunityCardPreview).
 *   5. One quiet row to the account, where the address, Member since, Last
 *      signed in and the plan are listed (components/profile/AccountFacts.tsx
 *      on Security). The address is nowhere on this page: people photograph it.
 *
 * Until 1.8 the phone also got a row of three tiles over the name (Saved,
 * Saints, Discover) and, under it, the three newest things saved as three
 * large cards with arrows; both went then. The desktop dashboard keeps its
 * counts, its newest saves and its links under the same first piece, since
 * on a computer this screen is the dashboard.
 */
export function ProfileTabClient() {
  const { t } = useTranslate();
  // Identity comes from the persisted cookie, read synchronously — NO
  // network, NO refresh, NO auth lock — so this can never hang (F-13:
  // getUser()/getSession() stalled on re-navigation and stranded this on
  // "Loading your profile…" forever). Render from the session IMMEDIATELY so
  // the tab is never blocked on a follow-up query; the profiles row (a nicer
  // display name) enhances it when it arrives. The server proxy keeps the
  // cookie fresh; getSession() is only a fallback if the raw read can't
  // parse.
  //
  // Read as the screen is first drawn, not a frame after it (1.9): the gate
  // above draws this only in the browser, never on the server, so there is no
  // server render to disagree with, and the reader's picture carried here
  // from You has its place to land on in the frame the page arrives
  // (lib/ui/routeMotion.ts, carryIn).
  const [data, setData] = useState<{
    uid: string | null;
    displayName: string;
  } | null>(() => {
    const sessionUser = readLocalSessionUser();
    return sessionUser
      ? {
          uid: sessionUser.id,
          displayName:
            (sessionUser.user_metadata?.display_name as string | undefined) ??
            (sessionUser.email?.split("@")[0] ?? "Reader"),
        }
      : null;
  });

  useEffect(() => {
    let cancelled = false;
    const sessionUser = readLocalSessionUser();
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
          uid: user.id,
          displayName:
            (user.user_metadata?.display_name as string | undefined) ??
            (user.email?.split("@")[0] ?? "Reader"),
        });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      // Enhance with the persisted display name.
      setData((prev) => ({
        uid: user.id,
        displayName:
          (profile.display_name as string | undefined) ??
          prev?.displayName ??
          "Reader",
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    // The picture, the name and the line under it, in their places, while
    // the session is read: a line of words here read as a broken screen.
    return (
      <div aria-busy="true" aria-label={t("ui.loadingYourProfile")} className="pt-0">
        <div className="flex items-center gap-[15px]">
          <Skeleton weight="mid" rounded="rounded-full" className="size-[66px] shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton weight="strong" className="h-7 w-40" />
            <Skeleton weight="faint" className="mt-2.5 h-3.5 w-48" />
          </div>
        </div>
        <Skeleton weight="faint" rounded="rounded-[20px]" className="mt-6 h-[122px] w-full" />
      </div>
    );
  }

  return (
    <>
      <SyncOnMount />
      <PostSignInBridge />
      <ProfileHero uid={data.uid} initialDisplayName={data.displayName} />
      {/* Phones and the apps only: the patron saint, with the rest of who the
          reader is. On the desktop dashboard it is on the Data tab, where it
          was; a phone's Data screen no longer draws it (1.6, one home each). */}
      <div className="mt-6 md:hidden native-md-block">
        <PatronSaintPicker />
      </div>
      {/* The life kept, the same piece as on You. A computer's dashboard says
          the streak in its own card below (ProfileStats). */}
      <LifeKeptHere className="mt-5 md:hidden native-md-block" />
      {/* The Community card as others see it, and the way into its editor.
          Only where Community is switched on. */}
      {communityEnabled() ? <CommunityCardPreview className="mt-7" /> : null}
      {/* The account, behind one quiet row at the foot: the address the
          reader signs in with, since when, and the plan are listed there,
          not on this page's face. A computer has the dashboard's own tabs. */}
      <div className="mt-7 md:hidden native-md-block">
        <Link
          href="/account/security"
          data-profile-account=""
          className={`flex min-h-[52px] items-center justify-between gap-4 px-4 py-3 motion-safe:transition-colors active:bg-paper/[0.04] ${INDEX_LIST_LOOK}`}
        >
          <span className="min-w-0 font-sans text-ui text-paper">{t("settings.accountSecurity")}</span>
          <ChevronLeft size={16} aria-hidden className="shrink-0 -scale-x-100 text-paper/35 rtl:scale-x-100" />
        </Link>
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
