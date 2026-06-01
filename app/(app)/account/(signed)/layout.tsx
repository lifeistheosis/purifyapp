import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReaderPrefsProvider } from "@/components/reader/ReaderPrefs";
import { AccountTabs } from "@/components/account/AccountTabs";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

/**
 * Layout for the signed-in account dashboard sub-routes:
 *   /account/profile · /account/security · /account/data · /account/sessions
 *
 * Lives in a `(signed)` route group so it only wraps these four
 * sub-routes, not the unsigned `/account` chooser at the leaf.
 *
 * Middleware bounces unsigned users to /signin before this renders;
 * the second auth check here is belt-and-suspenders for the case
 * where middleware is bypassed.
 */
export default async function SignedAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  return (
    <ReaderPrefsProvider>
      <MobileTopBar title="You" />
      <section className="px-5 md:px-8 py-10 md:py-14 bg-night min-h-[calc(100dvh-72px)]">
        <article className="mx-auto max-w-[820px] w-full">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
              Your account
            </p>
            <Link
              href="/account"
              className="font-sans text-caption text-paper/45 hover:text-paper transition-colors"
            >
              ← Back to chooser
            </Link>
          </div>
          <AccountTabs />
          {children}
        </article>
      </section>
    </ReaderPrefsProvider>
  );
}
