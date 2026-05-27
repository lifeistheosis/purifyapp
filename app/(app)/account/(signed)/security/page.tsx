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

  // Pass the FULL server-side identities snapshot down so the card
  // has both (a) the correct first paint and (b) the complete
  // identity objects supabase.auth.unlinkIdentity() requires. A
  // stripped-down { provider, identity_id } pair is enough to show
  // the Unlink button but caused the unlinkIdentity SDK call to
  // hang because it expects the full UserIdentity shape. JSON-clone
  // through serialization so we don't pass non-serializable values
  // through the server → client boundary.
  const initialIdentities = JSON.parse(
    JSON.stringify(user.identities ?? []),
  );

  return (
    <div className="flex flex-col gap-5">
      <ChangePasswordCard email={user.email ?? ""} hasPassword={hasPassword} />
      <ChangeEmailCard currentEmail={user.email ?? ""} />
      <OAuthConnectionsCard initialIdentities={initialIdentities} />
      <SignOutEverywhereCard />
    </div>
  );
}
