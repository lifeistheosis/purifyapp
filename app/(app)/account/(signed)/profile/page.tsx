import { createClient } from "@/lib/supabase/server";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { SyncOnMount } from "@/components/profile/SyncOnMount";
import { AccountChipRow } from "@/components/profile/AccountChipRow";
import { AccountSettingsLinks } from "@/components/profile/AccountSettingsLinks";
import { PostSignInBridge } from "@/components/profile/PostSignInBridge";

export const metadata = { title: "Profile" };

export default async function ProfileTabPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware + parent layout already gated this; if user is null
  // here, fall through to an empty state rather than crashing.
  if (!user) return null;

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
    <>
      <SyncOnMount />
      <PostSignInBridge />
      <AccountChipRow />
      <ProfileHero
        email={user.email ?? ""}
        initialDisplayName={displayName}
        joinedAt={joinedAt}
        lastSignedInAt={user.last_sign_in_at ?? undefined}
      />
      <ProfileStats />
      <ProfileActivity />
      <AccountSettingsLinks />
    </>
  );
}
