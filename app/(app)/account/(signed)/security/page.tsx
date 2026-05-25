import { createClient } from "@/lib/supabase/server";
import { ChangePasswordCard } from "@/components/account/security/ChangePasswordCard";
import { ChangeEmailCard } from "@/components/account/security/ChangeEmailCard";
import { OAuthConnectionsCard } from "@/components/account/security/OAuthConnectionsCard";
import { SignOutEverywhereCard } from "@/components/account/security/SignOutEverywhereCard";

export const metadata = { title: "Security" };

export default async function SecurityTabPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Read the has_password flag so the ChangePasswordCard renders in
  // "Set" mode (legacy magic-link user, no current password) instead
  // of "Change" mode (which would ask for a current password they
  // don't have).
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_password")
    .eq("id", user.id)
    .maybeSingle();
  const hasPassword = profile?.has_password === true;

  return (
    <div className="flex flex-col gap-5">
      <ChangePasswordCard email={user.email ?? ""} hasPassword={hasPassword} />
      <ChangeEmailCard currentEmail={user.email ?? ""} />
      <OAuthConnectionsCard />
      <SignOutEverywhereCard />
    </div>
  );
}
