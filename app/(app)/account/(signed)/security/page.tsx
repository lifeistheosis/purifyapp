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

  return (
    <div className="flex flex-col gap-5">
      <ChangePasswordCard email={user.email ?? ""} />
      <ChangeEmailCard currentEmail={user.email ?? ""} />
      <OAuthConnectionsCard />
      <SignOutEverywhereCard />
    </div>
  );
}
