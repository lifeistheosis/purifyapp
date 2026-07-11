import Link from "next/link";
import { ReaderPrefsProvider } from "@/components/reader/ReaderPrefs";
import { AccountTabs } from "@/components/account/AccountTabs";
import { AccountAuthGate } from "@/components/account/AccountAuthGate";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

/**
 * Layout for the signed-in account dashboard sub-routes:
 *   /account/profile · /account/security · /account/data · /account/sessions
 *
 * Lives in a `(signed)` route group so it only wraps these four
 * sub-routes, not the unsigned `/account` chooser at the leaf.
 *
 * Auth is enforced in two independent places, one per surface:
 *   - WEB: server middleware (lib/supabase/middleware via proxy.ts) bounces
 *     unsigned users off /account/* before this renders.
 *   - NATIVE: no server middleware and no build-time session, so the
 *     client-side <AccountAuthGate> resolves the WebView session at runtime.
 * The old server `getUser() + redirect` was removed because in the local-first
 * static export it baked a redirect to /signin into every account page.
 */
export default function SignedAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReaderPrefsProvider>
      <MobileTopBar title="You" />
      <section className="px-5 md:px-8 py-10 md:py-14 bg-night min-h-[calc(100dvh-72px)]">
        <article className="mx-auto max-w-[820px] w-full">
          <AccountAuthGate>
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
          </AccountAuthGate>
        </article>
      </section>
    </ReaderPrefsProvider>
  );
}
