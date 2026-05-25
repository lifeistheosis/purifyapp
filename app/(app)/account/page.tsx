import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReaderPrefsProvider } from "@/components/reader/ReaderPrefs";
import { UnsignedAccount } from "@/components/profile/UnsignedAccount";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ProfileSyncStatus } from "@/components/profile/ProfileSyncStatus";
import { ProfileDevices } from "@/components/profile/ProfileDevices";
import { ProfileData } from "@/components/profile/ProfileData";
import { ProfileDanger } from "@/components/profile/ProfileDanger";
import { SyncOnMount } from "@/components/profile/SyncOnMount";
import { AccountChipRow } from "@/components/profile/AccountChipRow";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
 title: "Your account",
 description:
 "Sign in to sync your highlights, notes, bookmarks, and prayer streaks across devices. Or keep everything local on this device. Your choice.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default async function AccountPage() {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return (
 <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
 <article className="mx-auto max-w-[1080px] w-full">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Your account
 </p>
 <h1 className="font-sans text-[40px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 Pick up where you left off.
 </h1>
 <p className="mt-6 font-serif text-[19px] text-paper/85 leading-[1.7] max-w-[640px]">
 Two real ways to use Purify, both free and both private. Keep
 everything on this device, or sync across devices with a
 one-tap email link. Either choice is reversible.
 </p>

 {/* min-h guards against layout shift: the client picks between
 AccountChoice (no local profile) and LocalProfileHero (local
 profile claimed) after mount; this height fits the larger of
 the two so the page doesn't jump. */}
 <div className="min-h-[520px]">
 <UnsignedAccount />
 </div>

 <p className="mt-10 font-sans text-[14px] text-paper/55 leading-[1.65] max-w-[640px]">
 The full data-handling rules, with every field stored and every
 third party named, are on the{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 privacy page
 </Link>
 .
 </p>
 </article>
 </section>
 );
 }

 // Pull the profile row for joinedAt / display_name (the trigger creates
 // it on sign-up). Fall back to email-derived name if missing.
 const { data: profile } = await supabase
 .from("profiles")
 .select("display_name, joined_at")
 .eq("id", user.id)
 .maybeSingle();

 const displayName =
 (profile?.display_name as string | undefined) ??
 (user.user_metadata?.display_name as string | undefined) ??
 (user.email?.split("@")[0] ?? "Reader");
 const joinedAt =
 (profile?.joined_at as string | undefined) ?? user.created_at ?? "";

 return (
 <ReaderPrefsProvider>
 <MobileTopBar title="You" />
 <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
 <article className="mx-auto max-w-[820px] w-full">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Your account
 </p>

 <SyncOnMount />

 <AccountChipRow />

 <ProfileHero
 email={user.email ?? ""}
 initialDisplayName={displayName}
 joinedAt={joinedAt}
 lastSignedInAt={user.last_sign_in_at ?? undefined}
 />

 <ProfileStats />

 <ProfileActivity />

 <ProfileSyncStatus />

 <ProfileSettings />

 <ProfileDevices />

 <ProfileData signedIn />

 <ProfileDanger signedIn />

 <p className="mt-12 text-center font-serif italic text-[16px] text-paper/55 leading-[1.65]">
 Glory to God for all things.
 </p>
 </article>
 </section>
 </ReaderPrefsProvider>
 );
}
