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
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        One quick thing
      </h1>
      <p className="font-serif text-ui text-paper/80 leading-[1.65] mb-7">
        Your account doesn&rsquo;t have a password yet. Choose one and
        you&rsquo;ll sign in with your email and password from anywhere
        &mdash; you won&rsquo;t see this page again.
      </p>
      <SetPasswordForm />
    </div>
  );
}
