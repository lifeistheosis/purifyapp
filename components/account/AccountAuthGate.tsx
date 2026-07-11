"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { resolveUser } from "@/lib/supabase/resolveUser";

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
 * the account UI when signed in, or redirects client-side when not.
 *
 * The redirect is reserved for a RESOLVED signed-out answer. When the check
 * can't complete — supabase-js's cross-tab auth lock held by another tab, or
 * a network failure (F-13) — redirecting would be a fake sign-out for a
 * signed-in user, so the gate shows a retry state instead.
 */
export function AccountAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "in" | "out" | "unresolved">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  // The retry handler resets to "loading" before bumping `attempt` (state
  // updates belong in handlers, not effect bodies — same shape as
  // useAsyncData.reload).
  useEffect(() => {
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      if (auth.state === "signed-in") {
        setState("in");
      } else if (auth.state === "signed-out") {
        setState("out");
        router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
      } else {
        setState("unresolved");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname, attempt]);

  if (state === "in") return <>{children}</>;

  if (state === "unresolved") {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-16 text-center">
        <p className="font-serif text-body text-paper/70 leading-[1.6]">
          We couldn&apos;t confirm your sign-in. Check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            setAttempt((n) => n + 1);
          }}
          className="tap-press mt-5 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          Try again
        </button>
      </div>
    );
  }

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
