"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side auth gate for the signed-in account dashboard.
 *
 * On the WEB the server middleware (lib/supabase/middleware, via proxy.ts)
 * already bounces unsigned users off /account/* before this renders. But the
 * native app ships as a local-first static export with NO server middleware
 * AND no server session at build time, so the old server-side
 * `getUser() + redirect("/signin")` in the layout baked a redirect to /signin
 * into every account page ("Account & security signs you out"). This gate
 * resolves the session at runtime from the WebView's own storage and renders
 * the account UI when signed in, or redirects client-side when not — working
 * identically on web and native.
 */
export function AccountAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.user) {
          setState("in");
        } else {
          setState("out");
          router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState("out");
        router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (state === "in") return <>{children}</>;

  // Loading / redirecting: a calm placeholder, never a crash or blank flash
  // of protected chrome.
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="font-sans text-caption text-paper/45">
        {state === "out" ? "Redirecting to sign in…" : "Loading your account…"}
      </p>
    </div>
  );
}
