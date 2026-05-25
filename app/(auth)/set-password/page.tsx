import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

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
      <h1 className="font-sans text-[28px] font-bold text-paper leading-tight mb-2">
        One quick thing
      </h1>
      <p className="font-serif text-[15px] text-paper/80 leading-[1.65] mb-7">
        Purify recently moved from email magic-links to real passwords
        plus optional Google / Apple sign-in. Choose a password for
        your account and you won&rsquo;t see this again.
      </p>
      <SetPasswordForm />
    </div>
  );
}
