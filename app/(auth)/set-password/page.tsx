import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Set a password",
};

/**
 * Forced password gate. The middleware redirects here when a signed-in
 * user's `profiles.has_password` is false. If somehow they reach this
 * page while NOT signed in, send them to /signin instead.
 */
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

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
