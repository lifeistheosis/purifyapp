import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountAuthGate } from "@/components/account/AccountAuthGate";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { T } from "@/components/i18n/T";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

export const metadata = {
  title: "Set a password",
};

/**
 * Forced password gate. The middleware redirects here when a signed-in
 * user's `profiles.has_password` is false. If somehow they reach this
 * page while NOT signed in, send them to /signin instead.
 *
 * In the apps there is no request to read at build time, so a redirect here
 * was baked into the export: an empty page, then a second switch to sign in
 * (Gate 3c group 2, 22 frames). There the gate decides on the device, by the
 * one rule for signed pages (lib/auth/signedHold.ts): a reader who is not
 * signed in goes straight to sign in from the page they left.
 */
export default async function SetPasswordPage() {
  if (IS_STATIC_EXPORT) {
    return (
      <AccountAuthGate to="/signin">
        <SetPasswordBody />
      </AccountAuthGate>
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return <SetPasswordBody />;
}

function SetPasswordBody() {
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        <T k="ui.oneQuickThing" />
      </h1>
      <p className="font-serif text-ui text-paper/80 leading-[1.65] mb-7">
        <T k="ui.yourAccountDoesnTHave" />
      </p>
      <SetPasswordForm />
    </div>
  );
}
